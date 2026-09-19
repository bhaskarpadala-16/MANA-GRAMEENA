import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local safely
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
let directUrl = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DIRECT_URL=')) {
    let val = trimmed.slice('DIRECT_URL='.length).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    directUrl = val;
    break;
  }
}

if (!directUrl) {
  console.error('DIRECT_URL not found');
  process.exit(1);
}

async function inspect() {
  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const functionNames = [
    'handle_new_user',
    'is_admin',
    'is_super_admin',
    'prevent_profile_role_escalation',
    'rls_auto_enable'
  ];

  console.log('=== INSPECTION START ===');

  // 1. Function definitions, secdef status, owner, search_path
  const funcsRes = await client.query(`
    SELECT 
      p.oid,
      p.proname,
      n.nspname AS schema_name,
      pg_get_userbyid(p.proowner) AS owner_name,
      p.prosecdef AS is_security_definer,
      p.proconfig AS search_path_config,
      pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = ANY($1)
    ORDER BY p.proname;
  `, [functionNames]);

  console.log('\n--- FUNCTIONS FOUND ---');
  for (const row of funcsRes.rows) {
    console.log(`\n========================================`);
    console.log(`Function: ${row.schema_name}.${row.proname}`);
    console.log(`OID: ${row.oid}`);
    console.log(`Owner: ${row.owner_name}`);
    console.log(`Security Definer: ${row.is_security_definer}`);
    console.log(`Search Path Config: ${JSON.stringify(row.search_path_config)}`);
    console.log(`Definition:\n${row.func_def}`);
  }

  // 2. Privilege inspection: acl / grant information
  console.log('\n--- PRIVILEGES (proacl) ---');
  const privsRes = await client.query(`
    SELECT 
      p.proname,
      n.nspname AS schema_name,
      p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = ANY($1);
  `, [functionNames]);

  for (const row of privsRes.rows) {
    console.log(`Function: ${row.schema_name}.${row.proname}, proacl: ${JSON.stringify(row.proacl)}`);
  }

  // Check specific has_function_privilege for roles: public, anon, authenticated, service_role, postgres
  const roles = ['public', 'anon', 'authenticated', 'service_role', 'postgres'];
  console.log('\n--- EVALUATED PRIVILEGES (has_function_privilege) ---');
  for (const fn of functionNames) {
    console.log(`\nPrivileges for ${fn}:`);
    for (const r of roles) {
      try {
        const checkRes = await client.query(`
          SELECT has_function_privilege($1, p.oid, 'EXECUTE') AS can_execute
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE p.proname = $2;
        `, [r, fn]);
        if (checkRes.rows.length > 0) {
          console.log(`  Role "${r}": EXECUTE = ${checkRes.rows[0].can_execute}`);
        } else {
          console.log(`  Role "${r}": function not found`);
        }
      } catch (err: any) {
        console.log(`  Role "${r}": Error checking (${err.message})`);
      }
    }
  }

  // 3. Dependency inspection: Triggers, RLS policies, views, or other functions referencing these
  console.log('\n--- TRIGGERS REFERENCING FUNCTIONS ---');
  const trigRes = await client.query(`
    SELECT 
      t.tgname AS trigger_name,
      c.relname AS table_name,
      n.nspname AS schema_name,
      p.proname AS func_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE p.proname = ANY($1);
  `, [functionNames]);

  for (const row of trigRes.rows) {
    console.log(`Trigger "${row.trigger_name}" on table "${row.schema_name}.${row.table_name}" calls "${row.func_name}"`);
  }

  console.log('\n--- RLS POLICIES REFERENCING FUNCTIONS ---');
  const polRes = await client.query(`
    SELECT 
      schemaname,
      tablename,
      policyname,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE qual LIKE '%is_admin%' 
       OR qual LIKE '%is_super_admin%'
       OR with_check LIKE '%is_admin%'
       OR with_check LIKE '%is_super_admin%';
  `);

  for (const row of polRes.rows) {
    console.log(`Policy "${row.policyname}" on "${row.schemaname}.${row.tablename}" (${row.cmd}) uses helper function`);
  }

  // 4. Where does rls_auto_enable come from? Let's check event triggers or normal triggers
  console.log('\n--- EVENT TRIGGERS (e.g. for rls_auto_enable) ---');
  const eventTrigRes = await client.query(`
    SELECT 
      evtname,
      evtevent,
      evtowner,
      evtfoid::regproc AS func_name,
      evtenabled
    FROM pg_event_trigger;
  `);

  if (eventTrigRes.rows.length === 0) {
    console.log('No event triggers found.');
  } else {
    for (const row of eventTrigRes.rows) {
      console.log(`Event trigger "${row.evtname}" (${row.evtevent}) calls "${row.func_name}"`);
    }
  }

  // Check references in pg_depend
  console.log('\n--- PG_DEPEND CHECK FOR rls_auto_enable ---');
  const depRes = await client.query(`
    SELECT 
      deptype,
      classid::regclass,
      objid,
      refclassid::regclass,
      refobjid
    FROM pg_depend
    WHERE objid = (SELECT oid FROM pg_proc WHERE proname = 'rls_auto_enable' LIMIT 1)
       OR refobjid = (SELECT oid FROM pg_proc WHERE proname = 'rls_auto_enable' LIMIT 1);
  `);
  console.log(`pg_depend rows for rls_auto_enable: ${depRes.rows.length}`);
  for (const row of depRes.rows) {
    console.log(`  deptype: ${row.deptype}, class: ${row.classid}, refclass: ${row.refclassid}`);
  }

  await client.end();
  console.log('\n=== INSPECTION FINISHED ===');
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});

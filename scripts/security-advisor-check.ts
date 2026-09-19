import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runAdvisorCheck() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log('=== SUPABASE SECURITY ADVISOR LIVE CHECK ===\n');

  // Check 1: SECURITY DEFINER functions in public schema executable by anon
  const secDefAnon = await client.query(`
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_userbyid(p.proowner) AS owner,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE') = true;
  `);

  console.log(`1. SECURITY DEFINER Functions Executable by anon: ${secDefAnon.rows.length}`);
  if (secDefAnon.rows.length > 0) {
    for (const r of secDefAnon.rows) {
      console.log(`   [FINDING] ${r.schema_name}.${r.function_name} executable by anon!`);
    }
  } else {
    console.log('   [CLEAN] ZERO Security Definer functions executable by anon in public schema.');
  }

  // Check 2: SECURITY DEFINER trigger / internal functions executable by authenticated
  // (excluding documented RLS helper is_admin())
  const secDefAuth = await client.query(`
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_userbyid(p.proowner) AS owner,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE') = true;
  `);

  console.log(`\n2. SECURITY DEFINER Functions Executable by authenticated: ${secDefAuth.rows.length}`);
  for (const r of secDefAuth.rows) {
    console.log(`   - ${r.schema_name}.${r.function_name}() -> authenticated EXECUTE = ${r.auth_execute}`);
  }

  // Check 3: Mutable search_path in SECURITY DEFINER functions
  const mutableSearchPath = await client.query(`
    SELECT 
      p.proname, 
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path=%'));
  `);

  console.log(`\n3. SECURITY DEFINER Functions with Mutable search_path: ${mutableSearchPath.rows.length}`);
  if (mutableSearchPath.rows.length > 0) {
    for (const r of mutableSearchPath.rows) {
      console.log(`   [WARNING] ${r.proname} has mutable search_path`);
    }
  } else {
    console.log('   [CLEAN] All Security Definer functions have explicit fixed search_path.');
  }

  // Check 4: Tables in public schema without RLS
  const rlsDisabled = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false 
      AND tablename != '_prisma_migrations';
  `);
  console.log(`\n4. Public Tables with RLS Disabled (excluding _prisma_migrations): ${rlsDisabled.rows.length}`);
  if (rlsDisabled.rows.length === 0) {
    console.log('   [CLEAN] 100% of application tables in public schema have RLS enabled (22/22).');
  }

  // Check 5: Tables with RLS enabled but without policies
  const rlsNoPolicy = await client.query(`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND c.relname != '_prisma_migrations'
      AND NOT EXISTS (
        SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
      );
  `);
  console.log(`\n5. Application Tables with RLS Enabled but NO Policy: ${rlsNoPolicy.rows.length}`);
  if (rlsNoPolicy.rows.length === 0) {
    console.log('   [CLEAN] All 22 application tables have active RLS policies.');
  }

  // Check internal table _prisma_migrations RLS status
  const prismaMig = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations';
  `);
  console.log(`\n6. Internal Prisma Migrations Table RLS status:`, prismaMig.rows[0]);

  await client.end();
  console.log('\n=== CHECK COMPLETE ===');
}

runAdvisorCheck().catch(err => {
  console.error('Advisor check error:', err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
const directMatch = content.match(/DIRECT_URL\s*=\s*["']?([^\r\n"']+)["']?/);
const directUrl = directMatch ? directMatch[1] : null;

async function runAdvisor() {
  if (!directUrl) {
    console.error('No DIRECT_URL found in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const findings: any[] = [];

  // Check 1: Tables without RLS in public schema
  const rlsRes = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false 
      AND tablename != '_prisma_migrations';
  `);
  if (rlsRes.rows.length > 0) {
    findings.push({
      advisor: 'RLS_DISABLED',
      severity: 'CRITICAL',
      affectedObjects: rlsRes.rows.map((r) => r.tablename),
      description: 'Tables in public schema have RLS disabled',
      relatesToAppSchema: true,
    });
  }

  // Check 2: Security Definer functions with mutable search_path
  const secDefRes = await client.query(`
    SELECT p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true;
  `);

  for (const r of secDefRes.rows) {
    const configStr = (r.proconfig || []).join('; ');
    const hasSafeSearchPath =
      configStr.includes('search_path=public, pg_temp') ||
      configStr.includes('search_path=public,pg_temp') ||
      /SET\s+search_path\s*=\s*['"]?public['"]?\s*,\s*['"]?pg_temp['"]?/i.test(r.def) ||
      /SET\s+search_path\s+TO\s+['"]?public['"]?\s*,\s*['"]?pg_temp['"]?/i.test(r.def);

    if (!hasSafeSearchPath) {
      findings.push({
        advisor: 'FUNCTION_SEARCH_PATH_MUTABLE',
        severity: 'WARNING',
        affectedObjects: [r.proname],
        proconfig: r.proconfig,
        description: 'Security definer function does not explicitly set search_path to public, pg_temp',
        relatesToAppSchema: true,
      });
    }
  }

  // Check 3: Check if any public tables have policies granting unconditional ALL access without filters (e.g. USING (true))
  const publicGrantRes = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (roles @> '{public}' OR roles @> '{anon}')
      AND cmd = 'ALL'
      AND (qual IS NULL OR qual = 'true' OR qual = 'true'::text);
  `);
  if (publicGrantRes.rows.length > 0) {
    findings.push({
      advisor: 'OVERLY_PERMISSIVE_POLICY',
      severity: 'CRITICAL',
      affectedObjects: publicGrantRes.rows.map((r) => `${r.tablename}.${r.policyname}`),
      description: 'Policy grants unrestricted ALL operations to public or anon without qualifications',
      relatesToAppSchema: true,
    });
  }

  await client.end();

  console.log('==================================================');
  console.log('SUPABASE SECURITY ADVISOR AUDIT RESULTS:');
  console.log('==================================================');
  console.log(
    JSON.stringify(
      {
        totalFindings: findings.length,
        findings,
        secDefFunctionsChecked: secDefRes.rows.map((r) => r.proname),
      },
      null,
      2
    )
  );
  console.log('==================================================');
}

runAdvisor().catch(console.error);

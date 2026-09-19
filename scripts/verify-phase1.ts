import fs from 'fs';
import path from 'path';

/**
 * Phase 1 Automated Verification Suite
 * Tests architecture compliance, secret isolation, and database configuration.
 */

function runVerification() {
  console.log('\n======================================================');
  console.log('MANA GRAMEENA — PHASE 1 AUTOMATED VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, failureDetail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (failureDetail) console.error(`       Detail: ${failureDetail}`);
      failed++;
    }
  }

  // 1. Schema Model Count Check
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const modelMatches = schemaContent.match(/^model\s+(\w+)\s+{/gm) || [];
  assert(
    modelMatches.length === 22,
    `Prisma Schema Table Count: Expected 22 models, found ${modelMatches.length}`,
    `Found models: ${modelMatches.map(m => m.replace(/model|\s+|{/g, '')).join(', ')}`
  );

  // 2. Prisma 7 Configuration Check
  const prismaConfigPath = path.join(process.cwd(), 'prisma.config.ts');
  const hasPrismaConfig = fs.existsSync(prismaConfigPath);
  const prismaConfigContent = hasPrismaConfig ? fs.readFileSync(prismaConfigPath, 'utf8') : '';
  assert(
    hasPrismaConfig && prismaConfigContent.includes('defineConfig') && prismaConfigContent.includes('datasource:'),
    'Prisma 7 Config: prisma.config.ts properly defines datasource and schema path'
  );

  // 3. Database Singleton & Server-Only Check
  const dbPath = path.join(process.cwd(), 'lib', 'db', 'index.ts');
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  assert(
    dbContent.includes("import 'server-only'") &&
      dbContent.includes('@prisma/adapter-pg') &&
      dbContent.includes('PrismaPg'),
    'Database Singleton: lib/db/index.ts has server-only guard and @prisma/adapter-pg'
  );

  // 4. Supabase Client Architecture Check
  const clientPath = path.join(process.cwd(), 'lib', 'supabase', 'client.ts');
  const clientContent = fs.readFileSync(clientPath, 'utf8');
  assert(
    clientContent.includes('createBrowserClient') &&
      clientContent.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') &&
      !clientContent.includes('SUPABASE_SECRET_KEY') &&
      !clientContent.includes('DATABASE_URL'),
    'Supabase Browser Client: Exclusively uses NEXT_PUBLIC credentials, zero secret leakage'
  );

  // 5. Supabase Admin Client Server-Only Guard Check
  const adminPath = path.join(process.cwd(), 'lib', 'supabase', 'admin.ts');
  const adminContent = fs.readFileSync(adminPath, 'utf8');
  assert(
    adminContent.includes("import 'server-only'") &&
      (adminContent.includes('SUPABASE_SECRET_KEY') || adminContent.includes('SUPABASE_SERVICE_ROLE_KEY')),
    'Supabase Admin Client: Enforces server-only boundary with SUPABASE_SECRET_KEY'
  );

  // 6. Supabase SSR Server Client Async Cookie Check
  const serverPath = path.join(process.cwd(), 'lib', 'supabase', 'server.ts');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  assert(
    serverContent.includes('createServerClient') && serverContent.includes('await cookies()'),
    'Supabase SSR Client: Configured for Next.js async cookies'
  );

  // 7. Server-Side Authorization Role Guard Check
  const authPath = path.join(process.cwd(), 'lib', 'auth', 'session.ts');
  const authContent = fs.readFileSync(authPath, 'utf8');
  assert(
    authContent.includes("import 'server-only'") &&
      authContent.includes('requireAdmin') &&
      authContent.includes('UserRole.ADMIN'),
    'Server Authorization: lib/auth/session.ts enforces server-side database role checks'
  );

  // 8. Secret Exposure Scan across All Source Files
  const srcDirs = ['app', 'components', 'lib'];
  let exposedSecrets = 0;
  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(?:[cm]?[jt]sx?)$/.test(file)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check if a client component imports or references secrets
        const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
        if (isClientComponent) {
          if (
            content.includes('SUPABASE_SECRET_KEY') ||
            content.includes('SUPABASE_SERVICE_ROLE_KEY') ||
            content.includes('DATABASE_URL') ||
            content.includes('DIRECT_URL')
          ) {
            console.error(`[LEAK DETECTED] Secret referenced in client component: ${fullPath}`);
            exposedSecrets++;
          }
        }
      }
    }
  }
  srcDirs.forEach(d => scanDir(path.join(process.cwd(), d)));
  assert(exposedSecrets === 0, 'Secret Isolation: Zero secret keys referenced in client components');

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();

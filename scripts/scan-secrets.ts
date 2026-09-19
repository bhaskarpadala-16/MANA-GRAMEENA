import fs from 'fs';
import path from 'path';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const secretKey = env.SUPABASE_SECRET_KEY || '';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

// Extract DB password from connection string
let dbPassword = '';
if (env.DIRECT_URL) {
  try {
    const u = new URL(env.DIRECT_URL);
    dbPassword = decodeURIComponent(u.password);
  } catch {}
}

const TARGET_DIRS = ['components', 'app', 'lib', '.next/static'];

function scanDir(dir: string, findings: Array<{ file: string; pattern: string }>) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, findings);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html'].includes(ext)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check for secret key leakage
        if (secretKey && secretKey.length > 8 && content.includes(secretKey)) {
          findings.push({ file: fullPath, pattern: 'SUPABASE_SECRET_KEY' });
        }
        if (serviceKey && serviceKey.length > 8 && content.includes(serviceKey)) {
          findings.push({ file: fullPath, pattern: 'SUPABASE_SERVICE_ROLE_KEY' });
        }
        if (dbPassword && dbPassword.length > 6 && content.includes(dbPassword)) {
          findings.push({ file: fullPath, pattern: 'DATABASE_PASSWORD' });
        }
        // Check for hardcoded service_role JWT
        if (content.includes('service_role') && !fullPath.includes('lib\\supabase\\admin.ts') && !fullPath.includes('lib/supabase/admin.ts') && !fullPath.includes('proxy.ts')) {
          // Check if it's an actual JWT or key
          if (content.match(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/)) {
            findings.push({ file: fullPath, pattern: 'HARDCODED_JWT' });
          }
        }
      }
    }
  }
}

async function main() {
  console.log('==================================================');
  console.log('SECRET & CREDENTIAL ISOLATION SCANNER');
  console.log('==================================================\n');

  const findings: Array<{ file: string; pattern: string }> = [];

  for (const dir of TARGET_DIRS) {
    const p = path.resolve(process.cwd(), dir);
    console.log(`Scanning: ${dir}...`);
    scanDir(p, findings);
  }

  console.log(`\nScan Complete.`);
  if (findings.length === 0) {
    console.log('[PASS] ZERO secrets, passwords, service keys, or JWTs leaked into source or client bundles.');
  } else {
    console.error(`[FAIL] Detected ${findings.length} potential leaks:`);
    findings.forEach((f) => console.error(`  - In ${f.file}: matched pattern ${f.pattern}`));
    process.exit(1);
  }
  console.log('\n==================================================');
}

main();

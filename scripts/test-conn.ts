import fs from 'fs';
import path from 'path';
import { Pool, Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

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

async function testDatabaseConnections() {
  console.log('==================================================');
  console.log('ENVIRONMENT & DATABASE CONNECTION DIAGNOSTIC');
  console.log('==================================================\n');

  // Parse URLs safely without secrets
  if (env.DATABASE_URL) {
    const u = new URL(env.DATABASE_URL);
    console.log(`DATABASE_URL: protocol=${u.protocol} host=${u.hostname} port=${u.port} db=${u.pathname}`);
  } else {
    console.log('DATABASE_URL: NOT FOUND');
  }

  if (env.DIRECT_URL) {
    const u = new URL(env.DIRECT_URL);
    console.log(`DIRECT_URL: protocol=${u.protocol} host=${u.hostname} port=${u.port} db=${u.pathname}`);
  } else {
    console.log('DIRECT_URL: NOT FOUND');
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL) {
    const u = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(`SUPABASE_URL: host=${u.hostname}`);
  }

  // 1. Test Supabase PostgREST over HTTPS (port 443)
  console.log('\n--- 1. Testing HTTPS (Port 443) to Supabase API ---');
  try {
    const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: products, error: prodErr } = await supabase.from('products').select('id, name, price, status').limit(2);
    if (prodErr) {
      console.log('HTTPS Supabase Query FAIL:', prodErr.message);
    } else {
      console.log('HTTPS Supabase Query SUCCESS! Found products:', products.length);
      products.forEach((p: any) => console.log(`  - Product: ${p.name} (price: ${p.price}, status: ${p.status})`));
    }

    const { data: categories, error: catErr } = await supabase.from('categories').select('id, name, slug').limit(3);
    if (!catErr && categories) {
      console.log('HTTPS Supabase Categories SUCCESS! Found categories:', categories.length);
      categories.forEach((c: any) => console.log(`  - Category: ${c.name} (${c.slug})`));
    }
  } catch (err: any) {
    console.error('HTTPS test error:', err.message);
  }

  // 2. Test DIRECT_URL (port 5432)
  console.log('\n--- 2. Testing DIRECT_URL TCP (Port 5432) ---');
  const directClient = new Client({
    connectionString: env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await directClient.connect();
    const res = await directClient.query('SELECT current_database(), current_user, version()');
    console.log('SUCCESS on Port 5432:', res.rows[0]);
    await directClient.end();
  } catch (err: any) {
    console.log('TCP Port 5432 Status:', err.message);
  }

  // 3. Test DATABASE_URL (port 6543)
  console.log('\n--- 3. Testing DATABASE_URL TCP (Port 6543) ---');
  const poolClient = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await poolClient.connect();
    const res = await poolClient.query('SELECT current_database(), current_user, version()');
    console.log('SUCCESS on Port 6543:', res.rows[0]);
    await poolClient.end();
  } catch (err: any) {
    console.log('TCP Port 6543 Status:', err.message);
  }

  // 4. Test DATABASE_URL over Port 443
  console.log('\n--- 4. Testing Pooler over Port 443 ---');
  if (env.DATABASE_URL) {
    try {
      const u443 = new URL(env.DATABASE_URL);
      u443.port = '443';
      const p443 = new Client({
        connectionString: u443.toString(),
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      await p443.connect();
      const res = await p443.query('SELECT current_database(), current_user, version()');
      console.log('SUCCESS on Pooler Port 443:', res.rows[0]);
      await p443.end();
    } catch (err: any) {
      console.log('Pooler Port 443 Status:', err.message);
    }
  }

  console.log('\n==================================================');
}

testDatabaseConnections();

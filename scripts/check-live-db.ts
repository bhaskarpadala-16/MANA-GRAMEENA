import fs from 'fs';
import path from 'path';
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
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const REQUIRED_22_TABLES = [
  'addresses',
  'admin_activity_logs',
  'cart_items',
  'carts',
  'categories',
  'coupon_usages',
  'coupons',
  'inventory',
  'inventory_transactions',
  'notifications',
  'order_items',
  'orders',
  'payment_proofs',
  'payments',
  'product_images',
  'product_variants',
  'products',
  'profiles',
  'reviews',
  'shipments',
  'wishlist_items',
  'wishlists',
];

async function main() {
  console.log('==================================================');
  console.log('LIVE SUPABASE DATABASE INTEGRITY VERIFICATION');
  console.log('==================================================\n');

  console.log(`Supabase Host: ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname}`);

  let verifiedTables = 0;
  for (const table of REQUIRED_22_TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`  [FAIL] Table ${table}: ${error.message}`);
    } else {
      console.log(`  [PASS] Table: ${table} (live row count: ${count ?? 0})`);
      verifiedTables++;
    }
  }

  console.log(`\nTable Status: ${verifiedTables} / ${REQUIRED_22_TABLES.length} verified.`);

  // Check migrations
  const { data: migs, error: migErr } = await supabase
    .from('_prisma_migrations')
    .select('migration_name, finished_at, rolled_back_at')
    .order('finished_at', { ascending: true });

  if (migErr) {
    console.error(`  [FAIL] _prisma_migrations: ${migErr.message}`);
  } else {
    console.log(`\nLive Applied Migrations (${migs?.length ?? 0}):`);
    migs?.forEach((m: any) => {
      console.log(`  - ${m.migration_name} (finished: ${m.finished_at ? 'YES' : 'NO'}, rolled_back: ${m.rolled_back_at ?? 'NO'})`);
    });
  }

  // Storage buckets check
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) {
    console.log(`\nStorage Buckets Check: ${bucketErr.message}`);
  } else {
    console.log(`\nLive Storage Buckets Count: ${buckets.length}`);
    buckets.forEach((b: any) => console.log(`  - Bucket: ${b.name}`));
  }

  console.log('\n==================================================');
}

main();

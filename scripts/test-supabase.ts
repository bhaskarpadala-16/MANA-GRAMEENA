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
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('--- Testing Supabase Client over HTTPS (Port 443) ---');
  
  const { count: productCount, error: prodErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  console.log('Products count:', productCount, 'Error:', prodErr);

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, is_active')
    .limit(3);
  console.log('Profiles sample:', profiles, 'Error:', profErr);

  const { count: orderCount, error: ordErr } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  console.log('Orders count:', orderCount, 'Error:', ordErr);

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug, display_order');
  console.log('Categories count:', categories?.length, 'Sample:', categories?.slice(0, 2), 'Error:', catErr);

  const { count: couponCount } = await supabase
    .from('coupons')
    .select('*', { count: 'exact', head: true });
  console.log('Coupons count:', couponCount);

  const { count: reviewCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });
  console.log('Reviews count:', reviewCount);

  const { count: inventoryCount } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });
  console.log('Inventory records count:', inventoryCount);
}

main();

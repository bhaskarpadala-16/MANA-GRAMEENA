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
const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=id,name,sku,price&limit=3`;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing HTTPS with service key to Supabase:', env.NEXT_PUBLIC_SUPABASE_URL);

fetch(url, {
  headers: {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
  },
})
  .then((res) => {
    console.log('HTTPS status code:', res.status, res.statusText);
    return res.json();
  })
  .then((data) => {
    console.log('Products returned from live Supabase DB via HTTPS:', JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error('HTTPS fetch error:', err.message);
  });

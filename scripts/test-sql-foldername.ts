import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const connString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('[SUCCESS] Connected to database.');

    const sampleName = '00000000-0000-0000-0000-000000000001/order_12345/screenshot.png';

    const fnDef = await client.query(`
      SELECT pg_get_functiondef(p.oid) as def 
      FROM pg_proc p 
      JOIN pg_namespace n ON n.oid = p.pronamespace 
      WHERE n.nspname = 'storage' AND p.proname = 'foldername'
    `);
    if (fnDef.rows.length > 0) {
      console.log('\n--- storage.foldername function definition ---');
      console.log(fnDef.rows[0].def);
    }

    const res = await client.query(`
      SELECT 
        $1::text as input_name,
        storage.foldername($1::text) as foldername_result,
        (storage.foldername($1::text))[1] as foldername_index_1,
        (storage.foldername($1::text))[2] as foldername_index_2,
        (storage.foldername($1::text))[3] as foldername_index_3,
        split_part($1::text, '/', 1) as split_part_1,
        split_part($1::text, '/', 2) as split_part_2,
        split_part($1::text, '/', 3) as split_part_3
    `, [sampleName]);

    console.log('\n--- LIVE SQL EVALUATION RESULTS ---');
    console.log(JSON.stringify(res.rows[0], null, 2));

    // Also inspect any storage policies in storage.objects
    const pols = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'storage' AND tablename = 'objects'
    `);
    console.log(`\n--- DEPLOYED POLICIES ON storage.objects (${pols.rows.length} found) ---`);
    for (const p of pols.rows) {
      console.log(`Policy: ${p.policyname} | Cmd: ${p.cmd} | Roles: ${JSON.stringify(p.roles)}`);
      console.log(`  USING: ${p.qual}`);
      console.log(`  WITH CHECK: ${p.with_check}\n`);
    }

    client.release();
    await pool.end();
  } catch (err: any) {
    console.error('Connection/Query Error:', err.message);
    await pool.end();
  }
}

main().catch(console.error);

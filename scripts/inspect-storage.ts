import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Client } from 'pg';

async function main() {
  const connUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connUrl) {
    console.error('No connection URL found in environment');
    process.exit(1);
  }

  let client: Client;
  try {
    client = new Client({ connectionString: connUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
  } catch (err) {
    console.log('Primary connection failed, trying fallback...');
    const fallbackUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
    client = new Client({ connectionString: fallbackUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
  }

  console.log('==================================================');
  console.log('TASK 1: STORAGE PATH & FOLDERNAME SEMANTICS');
  console.log('==================================================');

  // Check storage.foldername function definition
  const fnRes = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) as def 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage' AND p.proname = 'foldername'
  `);

  if (fnRes.rows.length > 0) {
    console.log('storage.foldername definition:');
    console.log(fnRes.rows[0].def);
  } else {
    console.log('storage.foldername function NOT found');
  }

  // Check storage.filename function definition if present
  const fnFilenameRes = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) as def 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage' AND p.proname = 'filename'
  `);
  if (fnFilenameRes.rows.length > 0) {
    console.log('\nstorage.filename definition:');
    console.log(fnFilenameRes.rows[0].def);
  }

  // Test storage.foldername on: userId/orderId/filename.png
  const samplePath = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/c732eed4-0d3a-4dd2-8b98-5c4bb8570c94/proof_1726750000000.png';
  console.log('\nTesting with sample path:', samplePath);

  const evalRes = await client.query(`
    SELECT 
      storage.foldername($1::text) as folders,
      (storage.foldername($1::text))[1] as index_1,
      (storage.foldername($1::text))[2] as index_2,
      (storage.foldername($1::text))[3] as index_3,
      storage.filename($1::text) as filename_fn,
      split_part($1::text, '/', 1) as split_part_1,
      split_part($1::text, '/', 2) as split_part_2,
      split_part($1::text, '/', 3) as split_part_3
  `, [samplePath]);

  console.log('Evaluation Results:');
  console.log(JSON.stringify(evalRes.rows[0], null, 2));

  console.log('\n==================================================');
  console.log('TASK 2: VERIFY DEPLOYED STORAGE POLICIES');
  console.log('==================================================');

  const policiesRes = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    ORDER BY policyname
  `);

  console.log(`Found ${policiesRes.rows.length} policies on storage.objects:`);
  for (const pol of policiesRes.rows) {
    console.log(`\nPolicy: "${pol.policyname}"`);
    console.log(`  Command:    ${pol.cmd}`);
    console.log(`  Roles:      ${JSON.stringify(pol.roles)}`);
    console.log(`  USING:      ${pol.qual}`);
    console.log(`  WITH CHECK: ${pol.with_check}`);
  }

  console.log('\n==================================================');
  console.log('TASK 3: VERIFY BUCKET EXISTENCE & CONFIG');
  console.log('==================================================');

  const bucketsRes = await client.query(`
    SELECT id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id
    FROM storage.buckets
    ORDER BY name
  `);

  console.log(`Found ${bucketsRes.rows.length} buckets in storage.buckets:`);
  for (const b of bucketsRes.rows) {
    console.log(`\nBucket: "${b.name}" (id: ${b.id})`);
    console.log(`  Public:             ${b.public}`);
    console.log(`  File size limit:    ${b.file_size_limit}`);
    console.log(`  Allowed MIME types: ${JSON.stringify(b.allowed_mime_types)}`);
  }

  await client.end();
}

main().catch(console.error);

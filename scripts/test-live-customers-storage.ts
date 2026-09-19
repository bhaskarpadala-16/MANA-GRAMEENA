import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !secretKey || !anonKey) {
    console.error('Missing configuration');
    process.exit(1);
  }

  const adminClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('==================================================');
  console.log('MANA GRAMEENA — TASK 5 LIVE STORAGE SECURITY TESTS');
  console.log('==================================================\n');

  // Step 1: Create ephemeral Customer A and Customer B in Supabase Auth
  const timestamp = Date.now();
  const emailA = `test-customer-a-${timestamp}@managrameena-test.com`;
  const emailB = `test-customer-b-${timestamp}@managrameena-test.com`;
  const password = `TestPass!_${timestamp}#99`;

  console.log('--- 1. Provisioning Ephemeral Test Users ---');
  const { data: userAData, error: errA } = await adminClient.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  if (errA || !userAData.user) {
    console.error('Failed to create user A:', errA?.message);
    process.exit(1);
  }
  const userA = userAData.user;
  console.log(`[OK] Customer A created: id=${userA.id}`);

  const { data: userBData, error: errB } = await adminClient.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  if (errB || !userBData.user) {
    console.error('Failed to create user B:', errB?.message);
    await adminClient.auth.admin.deleteUser(userA.id);
    process.exit(1);
  }
  const userB = userBData.user;
  console.log(`[OK] Customer B created: id=${userB.id}`);

  // Step 2: Create authenticated client sessions
  console.log('\n--- 2. Authenticating Customer Clients ---');
  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signInA = await clientA.auth.signInWithPassword({ email: emailA, password });
  if (signInA.error) {
    console.error('Customer A sign-in failed:', signInA.error.message);
  } else {
    console.log('[OK] Customer A session authenticated');
  }

  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signInB = await clientB.auth.signInWithPassword({ email: emailB, password });
  if (signInB.error) {
    console.error('Customer B sign-in failed:', signInB.error.message);
  } else {
    console.log('[OK] Customer B session authenticated');
  }

  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dummyImage = Buffer.from('FAKE-PNG-DATA-HERBAL-PAYMENT-PROOF-SCREENSHOT-12345');
  const pathA = `${userA.id}/order-101/proof_${timestamp}.png`;
  const pathB = `${userB.id}/order-202/proof_${timestamp}.png`;

  console.log('\n--- 3. Running Live Storage Security Matrix ---');

  // TEST 1: Anonymous upload -> DENIED
  console.log('Test 1: Anonymous upload to path A...');
  const { data: t1Data, error: t1Err } = await anonClient.storage
    .from('payment-proofs')
    .upload(pathA, dummyImage, { contentType: 'image/png' });
  if (t1Err) {
    console.log('  [PASS] Anonymous upload DENIED:', t1Err.message);
  } else {
    console.log('  [FAIL] Anonymous upload ALLOWED:', t1Data);
  }

  // TEST 2: Anonymous read -> DENIED
  console.log('\nTest 2: Anonymous read of path A...');
  const { data: t2Data, error: t2Err } = await anonClient.storage
    .from('payment-proofs')
    .download(pathA);
  if (t2Err) {
    console.log('  [PASS] Anonymous read DENIED:', t2Err.message);
  } else {
    console.log('  [FAIL] Anonymous read ALLOWED');
  }

  // TEST 3: Customer A upload to Customer A path -> Check result
  console.log(`\nTest 3: Customer A upload to own path: "${pathA}"...`);
  const { data: t3Data, error: t3Err } = await clientA.storage
    .from('payment-proofs')
    .upload(pathA, dummyImage, { contentType: 'image/png' });

  let customerUploadDirectAllowed = false;
  if (!t3Err && t3Data) {
    console.log('  [OBSERVATION] Customer A direct upload ALLOWED via storage policy:', t3Data.path);
    customerUploadDirectAllowed = true;
  } else {
    console.log('  [OBSERVATION] Customer A direct upload result:', t3Err?.message);
  }

  // TEST 4: If Customer A path exists or upload via admin client
  if (!customerUploadDirectAllowed) {
    console.log('  Uploading proof via admin service_role to test cross-tenant read/write isolation...');
    await adminClient.storage.from('payment-proofs').upload(pathA, dummyImage, { contentType: 'image/png' });
    await adminClient.storage.from('payment-proofs').upload(pathB, dummyImage, { contentType: 'image/png' });
  }

  // TEST 5: Customer A upload to Customer B path -> MUST BE DENIED
  console.log(`\nTest 5: Customer A attempt to upload into Customer B path: "${pathB}"...`);
  const { data: t5Data, error: t5Err } = await clientA.storage
    .from('payment-proofs')
    .upload(pathB, dummyImage, { contentType: 'image/png' });
  if (t5Err) {
    console.log('  [PASS] Customer A upload to Customer B path DENIED:', t5Err.message);
  } else {
    console.log('  [FAIL] Customer A upload to Customer B path ALLOWED (IDOR / CROSS-TENANT FLAW):', t5Data);
  }

  // TEST 6: Customer A read Customer B proof -> MUST BE DENIED
  console.log(`\nTest 6: Customer A attempt to read Customer B proof: "${pathB}"...`);
  const { data: t6Data, error: t6Err } = await clientA.storage
    .from('payment-proofs')
    .download(pathB);
  if (t6Err) {
    console.log('  [PASS] Customer A read of Customer B proof DENIED:', t6Err.message);
  } else {
    console.log('  [FAIL] Customer A read of Customer B proof ALLOWED (PRIVACY VIOLATION)');
  }

  // TEST 7: Customer A modify / overwrite Customer B proof -> MUST BE DENIED
  console.log(`\nTest 7: Customer A attempt to update / overwrite Customer B proof: "${pathB}"...`);
  const { data: t7Data, error: t7Err } = await clientA.storage
    .from('payment-proofs')
    .update(pathB, Buffer.from('hacked-image-data'), { contentType: 'image/png' });
  if (t7Err) {
    console.log('  [PASS] Customer A update of Customer B proof DENIED:', t7Err.message);
  } else {
    console.log('  [FAIL] Customer A update of Customer B proof ALLOWED');
  }

  // TEST 8: Customer A delete Customer B proof -> MUST BE DENIED
  console.log(`\nTest 8: Customer A attempt to delete Customer B proof: "${pathB}"...`);
  const { data: t8Data, error: t8Err } = await clientA.storage
    .from('payment-proofs')
    .remove([pathB]);
  // In Supabase Storage, remove returns array of deleted files. If RLS blocks it, returned data is empty [] or errors.
  if (!t8Data || t8Data.length === 0) {
    console.log('  [PASS] Customer A deletion of Customer B proof blocked / 0 files deleted');
  } else {
    console.log('  [FAIL] Customer A deleted Customer B proof:', t8Data);
  }

  // TEST 9: Admin authorized proof access -> MUST BE ALLOWED
  console.log('\nTest 9: Admin authorized signed URL generation for Customer A proof...');
  const { data: t9Data, error: t9Err } = await adminClient.storage
    .from('payment-proofs')
    .createSignedUrl(pathA, 900);
  if (t9Err || !t9Data?.signedUrl) {
    console.log('  [FAIL] Admin signed URL generation failed:', t9Err?.message);
  } else {
    console.log('  [PASS] Admin signed URL generation ALLOWED');
    const fetchSigned = await fetch(t9Data.signedUrl);
    if (fetchSigned.status === 200) {
      console.log('  [PASS] Admin signed URL fetched successfully (HTTP 200)');
    } else {
      console.log('  [FAIL] Admin signed URL fetch returned HTTP', fetchSigned.status);
    }
  }

  // TEST 10: Anonymous / non-admin unauthorized access to signed URL endpoint
  console.log('\nTest 10: Non-admin (anon client) attempting to create signed URL...');
  const { data: t10Data, error: t10Err } = await anonClient.storage
    .from('payment-proofs')
    .createSignedUrl(pathA, 900);
  if (t10Err) {
    console.log('  [PASS] Non-admin signed URL generation DENIED:', t10Err.message);
  } else {
    console.log('  [FAIL] Non-admin signed URL generation ALLOWED');
  }

  // CLEANUP
  console.log('\n--- 4. Cleaning up ephemeral test data ---');
  await adminClient.storage.from('payment-proofs').remove([pathA, pathB]);
  await adminClient.auth.admin.deleteUser(userA.id);
  await adminClient.auth.admin.deleteUser(userB.id);
  console.log('[OK] Cleaned up storage test objects and ephemeral auth users.');
}

main().catch(console.error);

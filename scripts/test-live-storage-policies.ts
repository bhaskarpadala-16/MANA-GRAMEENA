import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('==================================================');
  console.log('LIVE STORAGE POLICY & ACCESS TEST');
  console.log('==================================================\n');

  // Client 1: Anonymous (Unauthenticated)
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Client 2: Admin / Service Role
  const adminClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dummyFile = Buffer.from('fake-screenshot-content-12345');

  // TEST 1: Anonymous upload to payment-proofs
  console.log('1. Testing Anonymous upload to payment-proofs...');
  const { data: anonUploadData, error: anonUploadErr } = await anonClient.storage
    .from('payment-proofs')
    .upload('anon-test/test.png', dummyFile, { contentType: 'image/png' });

  if (anonUploadErr) {
    console.log('   [PASS] Anonymous upload DENIED:', anonUploadErr.message);
  } else {
    console.log('   [FAIL] Anonymous upload ALLOWED (VULNERABILITY):', anonUploadData);
    // Cleanup if allowed
    await adminClient.storage.from('payment-proofs').remove(['anon-test/test.png']);
  }

  // TEST 2: Anonymous download / read from payment-proofs
  console.log('\n2. Testing Anonymous download from payment-proofs...');
  const { data: anonDownloadData, error: anonDownloadErr } = await anonClient.storage
    .from('payment-proofs')
    .download('nonexistent/test.png');

  if (anonDownloadErr) {
    console.log('   [PASS] Anonymous download DENIED / Not found:', anonDownloadErr.message);
  } else {
    console.log('   [FAIL] Anonymous download ALLOWED');
  }

  // TEST 3: Admin upload
  console.log('\n3. Testing Admin / Service Role upload...');
  const testPath = 'admin-diagnostic/test.png';
  const { data: adminUploadData, error: adminUploadErr } = await adminClient.storage
    .from('payment-proofs')
    .upload(testPath, dummyFile, { contentType: 'image/png', upsert: true });

  if (adminUploadErr) {
    console.log('   [FAIL] Admin upload failed:', adminUploadErr.message);
  } else {
    console.log('   [PASS] Admin upload successful:', adminUploadData?.path);

    // TEST 4: Anonymous read of uploaded admin file
    console.log('\n4. Testing Anonymous download of existing file...');
    const { data: anonReadData, error: anonReadErr } = await anonClient.storage
      .from('payment-proofs')
      .download(testPath);

    if (anonReadErr) {
      console.log('   [PASS] Anonymous download of private file DENIED:', anonReadErr.message);
    } else {
      console.log('   [FAIL] Anonymous download of private file ALLOWED (CRITICAL LEAK)');
    }

    // TEST 5: Public URL access on private bucket
    console.log('\n5. Testing public URL resolution on private bucket...');
    const { data: publicUrlData } = adminClient.storage
      .from('payment-proofs')
      .getPublicUrl(testPath);
    console.log('   Generated Public URL:', publicUrlData.publicUrl);
    try {
      const fetchRes = await fetch(publicUrlData.publicUrl);
      console.log(`   HTTP Status of Public URL: ${fetchRes.status}`);
      if (fetchRes.status === 400 || fetchRes.status === 403 || fetchRes.status === 404) {
        console.log('   [PASS] Public URL blocked by private bucket setting');
      } else {
        console.log('   [FAIL] Public URL accessible without authentication (HTTP', fetchRes.status, ')');
      }
    } catch (e: any) {
      console.log('   Fetch error (blocked):', e.message);
    }

    // TEST 6: Signed URL generation
    console.log('\n6. Testing signed URL generation (expiresIn: 900)...');
    const { data: signedUrlData, error: signedUrlErr } = await adminClient.storage
      .from('payment-proofs')
      .createSignedUrl(testPath, 900);

    if (signedUrlErr || !signedUrlData?.signedUrl) {
      console.log('   [FAIL] Signed URL generation failed:', signedUrlErr?.message);
    } else {
      console.log('   [PASS] Signed URL generated successfully');
      console.log('   Signed URL snippet:', signedUrlData.signedUrl.slice(0, 80) + '...');
      const fetchSigned = await fetch(signedUrlData.signedUrl);
      console.log(`   HTTP Status of Signed URL: ${fetchSigned.status}`);
      if (fetchSigned.status === 200) {
        console.log('   [PASS] Signed URL is accessible and returns 200 OK');
      } else {
        console.log('   [FAIL] Signed URL returned HTTP', fetchSigned.status);
      }
    }

    // Clean up test file
    await adminClient.storage.from('payment-proofs').remove([testPath]);
    console.log('\n[CLEANUP] Removed test file', testPath);
  }
}

main().catch(console.error);

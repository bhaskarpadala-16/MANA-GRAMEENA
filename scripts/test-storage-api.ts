import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
  }

  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('==================================================');
  console.log('QUERYING SUPABASE STORAGE BUCKETS VIA API');
  console.log('==================================================\n');

  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.error('listBuckets error:', bErr.message);
  } else {
    console.log(`Found ${buckets?.length} buckets:`);
    for (const b of buckets || []) {
      console.log(`\nBucket: "${b.name}"`);
      console.log(`  id:                 ${b.id}`);
      console.log(`  public:             ${b.public}`);
      console.log(`  file_size_limit:    ${b.file_size_limit}`);
      console.log(`  allowed_mime_types: ${JSON.stringify(b.allowed_mime_types)}`);
    }
  }

  // Check if payment-proofs exists, if not, create it
  const paymentBucket = buckets?.find((b) => b.name === 'payment-proofs');
  if (!paymentBucket) {
    console.log('\n[NOTICE] Bucket "payment-proofs" not found. Creating private bucket now via Admin API...');
    const { data: newBucket, error: createErr } = await supabase.storage.createBucket('payment-proofs', {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (createErr) {
      console.error('Failed to create bucket:', createErr.message);
    } else {
      console.log('[SUCCESS] Created bucket "payment-proofs":', newBucket);
    }
  } else {
    console.log('\n[SUCCESS] Bucket "payment-proofs" already exists.');
    // Ensure public is false, size limit is 5MB, MIME types restricted
    if (paymentBucket.public || paymentBucket.file_size_limit !== 5 * 1024 * 1024) {
      console.log('Updating bucket settings...');
      const { error: updateErr } = await supabase.storage.updateBucket('payment-proofs', {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (updateErr) {
        console.error('Failed to update bucket:', updateErr.message);
      } else {
        console.log('[SUCCESS] Updated bucket "payment-proofs" to private with 5MB limit.');
      }
    }
  }
}

main().catch(console.error);

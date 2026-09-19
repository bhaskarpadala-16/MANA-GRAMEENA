import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock 'server-only' for standalone tsx execution
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {
  // no-op
}

async function main() {
  const { ensurePaymentProofsBucketExists } = await import('../lib/storage/index');

  console.log('==================================================');
  console.log('MANA GRAMEENA — SUPABASE STORAGE INITIALIZER');
  console.log('==================================================\n');

  console.log('Checking and initializing private "payment-proofs" bucket...');
  const success = await ensurePaymentProofsBucketExists();

  if (success) {
    console.log('[SUCCESS] Private "payment-proofs" bucket is active and verified.');
  } else {
    console.log('[NOTICE] Could not automatically verify bucket via API.');
  }

  console.log('\n--- RECOMMENDED SUPABASE STORAGE RLS POLICIES ---');
  console.log(`
-- 1. Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Customer Upload: Restrict inserts strictly to the customer's own folder
-- Path format: {userId}/{orderId}/{filename}
-- Uses both split_part (robust built-in) and storage.foldername (1-indexed array slice)
CREATE POLICY "payment_proofs_customer_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3. Customer Read: Restrict selects strictly to the customer's own folder
CREATE POLICY "payment_proofs_customer_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 4. Customer Update/Delete: Explicitly prohibited (immutable audit proofs)
-- No UPDATE or DELETE policies are granted to authenticated customers.

-- 5. Administrator Access: Full inspection permitted for authorized administrators
CREATE POLICY "payment_proofs_admin_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_admin()
);
`);
  console.log('==================================================\n');
}

main().catch(console.error);

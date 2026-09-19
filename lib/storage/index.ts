import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Initializes the private payment-proofs bucket in Supabase Storage if it does not already exist.
 * Ensures the bucket is private (public: false) with strict file size and MIME limits.
 */
export async function ensurePaymentProofsBucketExists(): Promise<boolean> {
  const adminClient = createAdminClient();

  try {
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
    if (listError) {
      logger.error('Storage', 'Failed to list storage buckets', { error: listError.message });
      return false;
    }

    const existingBucket = buckets?.find((b) => b.name === PAYMENT_PROOFS_BUCKET);
    if (existingBucket) {
      // Confirm bucket is strictly private
      if (existingBucket.public) {
        logger.warn('Storage', 'payment-proofs bucket was public; updating to private');
        await adminClient.storage.updateBucket(PAYMENT_PROOFS_BUCKET, {
          public: false,
          fileSizeLimit: MAX_FILE_SIZE_BYTES,
          allowedMimeTypes: [...ALLOWED_MIME_TYPES],
        });
      }
      return true;
    }

    // Create private bucket
    const { error: createError } = await adminClient.storage.createBucket(PAYMENT_PROOFS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES],
    });

    if (createError) {
      logger.error('Storage', 'Failed to create payment-proofs bucket', { error: createError.message });
      return false;
    }

    logger.info('Storage', 'Successfully initialized private payment-proofs bucket');
    return true;
  } catch (err: any) {
    logger.error('Storage', 'Exception while ensuring payment-proofs bucket', { error: err.message });
    return false;
  }
}

/**
 * Generates a short-lived signed URL for an authorized administrator to view a private proof screenshot.
 * @param storagePath The relative path within the payment-proofs bucket
 * @param expiresInSeconds Expiration time (default: 900 seconds / 15 minutes)
 */
export async function getSignedPaymentProofUrl(
  storagePath: string,
  expiresInSeconds = 900
): Promise<string | null> {
  if (!storagePath) return null;

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from(PAYMENT_PROOFS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      logger.error('Storage', 'Failed to generate signed URL for payment proof', {
        storagePath,
        error: error?.message,
      });
      return null;
    }

    return data.signedUrl;
  } catch (err: any) {
    logger.error('Storage', 'Exception generating signed URL', { error: err.message });
    return null;
  }
}

/**
 * Uploads a verified payment screenshot buffer to the private payment-proofs bucket.
 */
export async function uploadPaymentProofScreenshot(params: {
  userId: string;
  orderId: string;
  fileBuffer: Buffer;
  mimeType: AllowedMimeType;
  fileExtension: string;
}): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  const { userId, orderId, fileBuffer, mimeType, fileExtension } = params;

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: 'File size exceeds maximum 5MB limit.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { success: false, error: 'Only JPEG, PNG, and WebP images are permitted.' };
  }

  // Sanitized deterministic path: {userId}/{orderId}/{timestamp}.{ext}
  const cleanExt = fileExtension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const timestamp = Date.now();
  const storagePath = `${userId}/${orderId}/${timestamp}.${cleanExt}`;

  try {
    const adminClient = createAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from(PAYMENT_PROOFS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Storage', 'Failed to upload screenshot to payment-proofs', {
        storagePath,
        error: uploadError.message,
      });
      return { success: false, error: 'Failed to save screenshot in secure storage.' };
    }

    return { success: true, storagePath };
  } catch (err: any) {
    logger.error('Storage', 'Exception uploading payment proof', { error: err.message });
    return { success: false, error: 'Unexpected storage failure. Please try again.' };
  }
}

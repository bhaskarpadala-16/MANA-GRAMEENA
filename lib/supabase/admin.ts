import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Elevated server-only Supabase client.
 * Uses SUPABASE_SECRET_KEY.
 *
 * CRITICAL SECURITY RULE:
 * This client bypasses RLS and must NEVER be imported or bundled into client components.
 * Used exclusively for administrative operations, server-side proof verification,
 * and user provisioning.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'Missing Supabase secret configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not defined.'
    );
  }

  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

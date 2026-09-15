import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-safe Supabase client for client components.
 * Uses public publishable credentials only.
 * Governed strictly by PostgreSQL Row Level Security (RLS).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase public configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not defined.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

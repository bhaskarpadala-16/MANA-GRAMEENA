import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * MANA GRAMEENA — EMAIL SIGNUP CONFIRMATION ROUTE
 * Handles email verification tokens dispatched during user registration.
 *
 * Route: /auth/confirm?token_hash=...&type=email&next=/account
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');

  const safeRedirectDestination = getSafeRedirectUrl(next, '/account');

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      const response = NextResponse.redirect(new URL(safeRedirectDestination, request.url));
      response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
      return response;
    }
  }

  // Verification failed or expired: redirect safely to login with error feedback
  const errorUrl = new URL('/login', request.url);
  errorUrl.searchParams.set('error', 'InvalidOrExpiredConfirmationLink');
  const response = NextResponse.redirect(errorUrl);
  response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  return response;
}

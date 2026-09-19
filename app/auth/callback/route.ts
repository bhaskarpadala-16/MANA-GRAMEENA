import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * MANA GRAMEENA — AUTH CALLBACK & RECOVERY ROUTE
 * Handles OAuth, PKCE, and password recovery code exchange.
 *
 * Route: /auth/callback?code=...&type=recovery
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery flow routes directly to /reset-password
      if (type === 'recovery') {
        const resetUrl = new URL('/reset-password', request.url);
        const response = NextResponse.redirect(resetUrl);
        response.headers.set(
          'Cache-Control',
          'private, no-cache, no-store, max-age=0, must-revalidate'
        );
        return response;
      }

      // Default authentication callback routes to safe internal destination
      const safeDestination = getSafeRedirectUrl(next, '/account');
      const response = NextResponse.redirect(new URL(safeDestination, request.url));
      response.headers.set(
        'Cache-Control',
        'private, no-cache, no-store, max-age=0, must-revalidate'
      );
      return response;
    }
  }

  // Code exchange failed or link expired
  const errorRedirect = new URL('/login', request.url);
  errorRedirect.searchParams.set(
    'error',
    type === 'recovery' ? 'InvalidOrExpiredResetLink' : 'AuthCallbackFailed'
  );
  const response = NextResponse.redirect(errorRedirect);
  response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  return response;
}

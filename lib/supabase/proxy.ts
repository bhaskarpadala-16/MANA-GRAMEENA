import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * MANA GRAMEENA — PROXY SESSION & ROUTE INTERCEPTION HELPER
 *
 * Intercepts requests via Next.js 16 proxy.ts:
 * 1. Manages @supabase/ssr session cookie lifecycle across request/response boundaries.
 * 2. Cryptographically verifies JWT claims using supabase.auth.getClaims().
 * 3. Applies defensive route classification (redirecting unauthenticated requests).
 * 4. Strictly enforces Cache-Control headers on authenticated responses to prevent CDN/cache leakage.
 *
 * CRITICAL ARCHITECTURAL RULE:
 * Proxy interception is a routing convenience and NOT the security boundary.
 * All Server Actions and API endpoints independently enforce server-side database authorization.
 */

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Fail safe if Supabase credentials are missing
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Cryptographically verify session claims using getClaims()
  // This verifies signature and claims against Supabase JWKS without low-level getSession()
  let hasValidClaims = false;
  let userId: string | null = null;

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims?.sub) {
      hasValidClaims = true;
      userId = data.claims.sub;
    }
  } catch {
    hasValidClaims = false;
  }

  const pathname = request.nextUrl.pathname;

  // 1. Defend Customer Protected Routes (/account/*)
  if (pathname.startsWith('/account')) {
    if (!hasValidClaims) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      copyCookies(supabaseResponse, redirectResponse);
      applyNoStoreHeaders(redirectResponse);
      return redirectResponse;
    }

    // Authenticated customer route: enforce private no-cache
    applyNoStoreHeaders(supabaseResponse);
  }

  // 2. Defend Admin Protected Routes (/admin/*, excluding /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!hasValidClaims) {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('returnUrl', pathname);
      const redirectResponse = NextResponse.redirect(adminLoginUrl);
      copyCookies(supabaseResponse, redirectResponse);
      applyNoStoreHeaders(redirectResponse);
      return redirectResponse;
    }

    // Authenticated admin route: enforce private no-cache
    applyNoStoreHeaders(supabaseResponse);
  }

  // 3. Convenience Redirects for already authenticated customers visiting /login or /register
  if ((pathname === '/login' || pathname === '/register') && hasValidClaims) {
    const accountUrl = new URL('/account', request.url);
    const redirectResponse = NextResponse.redirect(accountUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

/**
 * Propagates updated cookies from source response to redirect response.
 */
function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie.name, cookie.value, cookie);
  });
}

/**
 * Applies strict anti-caching headers to prevent intermediate CDNs
 * or browser caches from leaking user-specific authenticated content or sessions.
 */
function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
}

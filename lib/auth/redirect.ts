/**
 * MANA GRAMEENA — OPEN REDIRECT DEFENSE UTILITY
 * Validates redirect target URLs to ensure they strictly point to safe internal relative routes.
 * Prevents protocol-relative attacks (//evil.com), backslash attacks (/\\evil.com),
 * URL-encoded evasion (/%5c, /%2f), CRLF injection, and absolute external URLs.
 */

export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = '/account'
): string {
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  const trimmed = target.trim();

  // Prevent CRLF injection / HTTP response splitting / control characters
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  // Decode URI components to detect obfuscated backslashes or slashes
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // Both raw and decoded representations must start with single '/' and not '//' or '/\'
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.startsWith('/\\')
  ) {
    return fallback;
  }

  // Disallow any scheme / protocol (e.g. javascript:, data:, https:, http:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return fallback;
  }

  // Disallow backslashes anywhere in path
  if (trimmed.includes('\\') || decoded.includes('\\')) {
    return fallback;
  }

  // Ensure parsing as relative URL resolves strictly to internal localhost origin
  try {
    const dummyBase = 'http://localhost';
    const parsed = new URL(trimmed, dummyBase);
    if (parsed.origin !== dummyBase) {
      return fallback;
    }

    // Strict internal path allowlist to prevent open redirect or unauthorized path traversal
    const ALLOWED_PATH_PREFIXES = [
      '/',
      '/account',
      '/admin',
      '/cart',
      '/checkout',
      '/products',
      '/categories',
      '/search',
      '/orders',
      '/wishlist',
      '/notifications',
      '/profile',
      '/addresses',
    ];

    const isAllowed = ALLOWED_PATH_PREFIXES.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)
    );

    if (!isAllowed) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Resolves the canonical, trusted site origin for auth links (signup confirmation, recovery).
 * Strictly prioritizes server-configured NEXT_PUBLIC_SITE_URL over any client-provided origin header.
 * Allows client origin header only as development fallback when NEXT_PUBLIC_SITE_URL is unset.
 */
export function getTrustedOrigin(clientOrigin?: string | null): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_SITE_URL);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // If configured site URL is invalid/malformed, safely fall back
    }
  }
  if (process.env.NODE_ENV !== 'production' && clientOrigin) {
    try {
      const parsed = new URL(clientOrigin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // If client origin is invalid/malformed, safely fall back
    }
  }
  return 'http://localhost:3000';
}

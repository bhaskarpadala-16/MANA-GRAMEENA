import type { MetadataRoute } from 'next';

/**
 * Production robots.txt generator.
 * Explicitly allows public storefront routes while disallowing
 * customer account portals, administrative dashboards, and internal auth callbacks.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://managrameena.com';
  const cleanBaseUrl = siteUrl.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/products',
        '/products/*',
        '/categories',
        '/categories/*',
        '/about',
        '/contact',
        '/policies/*',
      ],
      disallow: [
        '/admin/',
        '/admin/*',
        '/account/',
        '/account/*',
        '/auth/',
        '/auth/*',
        '/checkout',
        '/cart',
        '/api/',
      ],
    },
    sitemap: `${cleanBaseUrl}/sitemap.xml`,
  };
}

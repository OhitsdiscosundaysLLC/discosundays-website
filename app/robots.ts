import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/content';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // Nothing is crawlable until ALLOW_INDEXING=1 is set at go-live, so *.vercel.app deployments are never indexed.
  const isProd = process.env.ALLOW_INDEXING === '1';
  return {
    rules: isProd
      ? [{ userAgent: '*', allow: '/', disallow: ['/cart', '/search', '/api/', '/*?*variant=', '/collections/*+*', '/collections/*%2B*', '/collections/*sort_by*'] }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

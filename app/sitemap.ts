import type { MetadataRoute } from 'next';
import { listPaths, SITE_URL } from '@/lib/content';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const skip = /^\/(es\/)?(cart|search|agents\.md)$|\?/;
  return listPaths().filter((p) => !skip.test(p.replace(/^\//, '/'))).map((p) => ({
    url: SITE_URL + (p === '/' ? '' : p),
    changeFrequency: p.includes('/blogs/') ? 'weekly' : 'monthly',
    priority: p === '/' ? 1 : p.split('/').length <= 3 ? 0.8 : 0.6,
  }));
}

import fs from 'node:fs';
import path from 'node:path';
import { optimizeHtml } from '@/lib/media';

/** Serves the related-products section that the theme fetches (Shopify's section rendering API). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = (u.searchParams.get('product_id') || '').replace(/\D/g, '');
  const lang = u.pathname.startsWith('/es/') ? 'es' : 'en';
  const file = path.join(process.cwd(), 'content', 'recommendations', `${lang}-${id}.html`);
  if (!id || !fs.existsSync(file)) return new Response('', { status: 404 });
  return new Response(optimizeHtml(fs.readFileSync(file, 'utf8')), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

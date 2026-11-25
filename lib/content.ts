import fs from 'node:fs';
import path from 'node:path';
import routes from '@/content/routes.json';

export type PageContent = {
  path: string;
  status: number;
  lang: string;
  title: string;
  description: string;
  canonical: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
  jsonld: string[];
  bodyClass: string;
  bodyStyle: string;
  htmlClass: string;
  html: string;
};

export type Lang = 'en' | 'es';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://discosundays.com').replace(/\/$/, '');

const ROUTES = routes as Record<string, string>;

/** Shopify path (as crawled) -> URL slug segments used by Next.js (query pages become /__page-N). */
export function slugFor(shopifyPath: string, lang: Lang): string[] | null {
  let p = shopifyPath;
  if (lang === 'es') {
    if (p !== '/es' && !p.startsWith('/es/')) return null;
    p = p.slice(3) || '/';
  } else if (p === '/es' || p.startsWith('/es/')) return null;
  p = p.replace(/\?page=(\d+)$/, '/__page-$1');
  if (p.includes('?')) return null;
  return p.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
}

export function allSlugs(lang: Lang): { slug: string[] }[] {
  const out: { slug: string[] }[] = [];
  for (const p of Object.keys(ROUTES)) {
    if (/404-test-page$/.test(p)) continue;
    const s = slugFor(p, lang);
    if (s) out.push({ slug: s });
  }
  return out;
}

function shopifyPathFor(slug: string[] | undefined, lang: Lang): string {
  const segs = (slug || []).map((s) => encodeURIComponent(decodeURIComponent(s)));
  let p = '/' + segs.join('/');
  p = p.replace(/\/__page-(\d+)$/, '?page=$1');
  if (lang === 'es') p = p === '/' ? '/es' : '/es' + p;
  return p;
}

const cache = new Map<string, PageContent>();
function load(file: string): PageContent {
  if (!cache.has(file)) {
    cache.set(file, JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', file.replace(/^content\//, '')), 'utf8')));
  }
  return cache.get(file)!;
}

export function getPage(slug: string[] | undefined, lang: Lang): PageContent | null {
  const p = shopifyPathFor(slug, lang);
  const file = ROUTES[p] ?? ROUTES[decodeURIComponent(p)] ?? findLoose(p);
  return file ? load(file) : null;
}

function findLoose(p: string): string | undefined {
  const want = decodeURIComponent(p).toLowerCase();
  const hit = Object.keys(ROUTES).find((k) => decodeURIComponent(k).toLowerCase() === want);
  return hit ? ROUTES[hit] : undefined;
}

export function getNotFound(lang: Lang): PageContent | null {
  const f = ROUTES[lang === 'es' ? '/es/404-test-page' : '/404-test-page'];
  return f ? load(f) : null;
}

export function listPaths(): string[] {
  return Object.keys(ROUTES).filter((p) => !/404-test-page$/.test(p));
}

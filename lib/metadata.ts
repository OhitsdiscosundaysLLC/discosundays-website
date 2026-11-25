import type { Metadata } from 'next';
import { SITE_URL, type PageContent } from './content';

const decode = (s: string) =>
  s.replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

const abs = (u?: string) => (!u ? undefined : u.startsWith('http') ? u : SITE_URL + (u.startsWith('/') ? u : '/' + u));

export function pageMetadata(page: PageContent): Metadata {
  const canonicalPath = page.canonical || page.path;
  const enPath = page.lang === 'es' ? canonicalPath.replace(/^\/es(?=\/|$)/, '') || '/' : canonicalPath;
  const esPath = enPath === '/' ? '/es' : '/es' + enPath;
  const og = page.og;
  return {
    title: { absolute: decode(page.title) },
    description: decode(page.description) || undefined,
    alternates: {
      canonical: abs(canonicalPath),
      languages: { 'x-default': abs(enPath)!, en: abs(enPath)!, es: abs(esPath)! },
    },
    openGraph: {
      siteName: og.site_name,
      url: abs(og.url ? new URL(og.url, SITE_URL).pathname : canonicalPath),
      title: og.title ? decode(og.title) : undefined,
      type: og.type === 'article' ? 'article' : 'website',
      description: og.description ? decode(og.description) : undefined,
      images: og.image ? [{ url: abs(og.image)!, width: Number(og['image:width']) || undefined, height: Number(og['image:height']) || undefined }] : undefined,
    },
    twitter: {
      card: (page.twitter.card as 'summary_large_image') || 'summary_large_image',
      title: page.twitter.title ? decode(page.twitter.title) : undefined,
      description: page.twitter.description ? decode(page.twitter.description) : undefined,
    },
    icons: { icon: '/shop/files/NEWSTUFFDESIGN.png' },
    other: Object.fromEntries(
      Object.entries(og).filter(([k]) => k === 'type' && !['website', 'article'].includes(og.type) || k.startsWith('price:')).map(([k, v]) => ['og:' + k, v]),
    ),
  };
}

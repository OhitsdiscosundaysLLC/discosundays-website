import fs from 'node:fs';
import path from 'node:path';

// Swaps original media URLs for their optimized copies (built by scripts/optimize-media.mjs) and lets the
// browser defer offscreen images. Runs at build time on the stored theme HTML; the markup structure is unchanged.
let replacer: ((html: string) => string) | null = null;

function build(): (html: string) => string {
  const file = path.join(process.cwd(), 'content', 'media-map.json');
  const map: Record<string, string> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (!keys.length) return (h) => h;
  const re = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return (h) => h.replace(re, (m) => map[m] ?? m);
}

const EAGER_IMAGES = 6; // header logo and the first visible images load immediately

export function optimizeHtml(html: string): string {
  replacer ??= build();
  let out = replacer(html);
  let n = 0;
  out = out.replace(/<img\b([^>]*)>/gi, (tag, attrs: string) => {
    n++;
    if (n <= EAGER_IMAGES || /\sloading=/i.test(attrs)) return tag;
    return `<img loading="lazy" decoding="async"${attrs}>`;
  });
  return out;
}

// Builds lighter copies of the heavy media the pages reference, without changing any page markup:
//   photos (PNG/JPEG > 150 KB)  -> WebP, same pixel dimensions
//   animated GIFs (> 300 KB)    -> animated WebP, same dimensions and timing
//   videos (MP4 > 15 MB)        -> H.264 MP4 at the same resolution, CRF 24, fast-start
// Originals stay untouched in public/shop. Optimized files go to public/opt/<same path>, and
// content/media-map.json maps each original URL to its optimized URL. lib/content.ts swaps the URLs
// when pages render, so the DOM (and every CSS selector) stays identical.
// Usage: node scripts/optimize-media.mjs            (needs `sharp`; videos need `ffmpeg-static`)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const MAP_FILE = path.join(ROOT, 'content/media-map.json');
const map = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : {};
let ffmpeg = null;
try { ffmpeg = (await import('ffmpeg-static')).default; } catch { console.log('ffmpeg-static not installed: videos skipped'); }

// 1. every /shop/ media URL referenced by the pages, widgets and recommendation snippets
const urls = new Set();
const scan = (txt) => { for (const m of txt.matchAll(/\/shop\/[^"'\s)\\,]+?\.(?:png|jpe?g|gif|mp4)/gi)) urls.add(m[0]); };
const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (/\.(json|html)$/.test(f.name) && f.name !== 'media-map.json') scan(fs.readFileSync(p, 'utf8')); } };
walk(path.join(ROOT, 'content'));

const stats = { photo: [0, 0, 0], gif: [0, 0, 0], video: [0, 0, 0] };
const done = new Map(); // decoded file path -> optimized url (one encode per file)
for (const url of [...urls].sort()) {
  let rel;
  try { rel = decodeURIComponent(url); } catch { rel = url; }
  const src = path.join(ROOT, 'public', rel);
  if (!fs.existsSync(src)) continue;
  const size = fs.statSync(src).size;
  const ext = path.extname(src).toLowerCase();
  const kind = ext === '.gif' ? 'gif' : ext === '.mp4' ? 'video' : 'photo';
  const min = { photo: 150e3, gif: 300e3, video: 15e6 }[kind];
  if (size < min) continue;
  if (done.has(src)) { if (done.get(src)) map[url] = done.get(src); continue; }
  const outRel = kind === 'video' ? path.join('/opt', rel) : path.join('/opt', rel + '.webp');
  const out = path.join(ROOT, 'public', outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
      if (kind === 'photo') {
        const meta = await sharp(src).metadata();
        await sharp(src).rotate().webp(meta.hasAlpha ? { quality: 86, alphaQuality: 90, effort: 5 } : { quality: 82, effort: 5 }).toFile(out);
      } else if (kind === 'gif') {
        await sharp(src, { animated: true, limitInputPixels: false }).webp({ quality: 78, effort: 4, loop: 0 }).toFile(out);
      } else {
        if (!ffmpeg) { done.set(src, null); continue; }
        execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', out]);
      }
    }
    const newSize = fs.statSync(out).size;
    if (newSize > size * 0.85) { fs.rmSync(out); done.set(src, null); delete map[url]; continue; } // not worth it
    const outUrl = encodeURI(outRel.split(path.sep).join('/'));
    map[url] = outUrl;
    done.set(src, outUrl);
    stats[kind][0]++; stats[kind][1] += size; stats[kind][2] += newSize;
  } catch (e) {
    console.log('skip', url, String(e).slice(0, 120));
    done.set(src, null);
  }
}
fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));
for (const [k, [n, a, b]] of Object.entries(stats)) console.log(`${k}: ${n} files ${(a / 2 ** 20).toFixed(1)} MB -> ${(b / 2 ** 20).toFixed(1)} MB`);
console.log('map entries', Object.keys(map).length);

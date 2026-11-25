// Turns the Elfsight capture (scripts/capture-elfsight.mjs) into self-contained native sections:
//  - downloads every image the widgets show (Elfsight file storage, YouTube thumbnails, channel art) into
//    public/elfsight/<widget>/, keeps the team-gallery originals in media-originals/elfsight/, and makes WebP
//    display copies;
//  - stores clean markup + CSS per widget in content/widgets/elfsight/<id>.json (desktop and mobile variants,
//    Elfsight branding, error panels and absolute layout positions removed);
//  - embeds that markup into every page that had the widget (content/pages/**.json) and removes Elfsight's
//    platform.js, so pages render the sections server-side with no third-party script.
// Usage: node scripts/build-elfsight.mjs <captureDir> <settingsDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { embedElfsight } from './lib/elfsight-embed.mjs';

const [CAP, SET] = process.argv.slice(2);
const ROOT = process.cwd();
const OUT_DATA = path.join(ROOT, 'content/widgets/elfsight');
fs.mkdirSync(OUT_DATA, { recursive: true });

const KIND = {
  '994ebbff-c4a5-4bed-aca1-94b0a512c760': 'gallery',
  '363e1a3e-bff4-4665-b2e0-caa699fdb19d': 'youtube',
  'a837ee3e-c0c0-48c0-9836-e69955cc55a8': 'form',
  '7b28fc37-1130-482c-9f49-05404b4e5dbf': 'form',
};
const FORM_KIND = { 'a837ee3e-c0c0-48c0-9836-e69955cc55a8': 'epk', '7b28fc37-1130-482c-9f49-05404b4e5dbf': 'remote-mixing' };

const cache = new Map();
async function localize(url, dir) {
  if (!/^https?:\/\//.test(url)) return url;
  if (cache.has(url)) return cache.get(url);
  const clean = url.replace(/&amp;/g, '&');
  let res;
  try { res = await fetch(clean); } catch { res = null; }
  if (!res || !res.ok) { console.log('  could not download', clean.slice(0, 100)); cache.set(url, null); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get('content-type') || '';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('svg') ? 'svg' : type.includes('gif') ? 'gif' : 'jpg';
  const name = crypto.createHash('sha1').update(clean).digest('hex').slice(0, 16);
  const rel = `/elfsight/${dir}/${name}.${ext}`;
  fs.mkdirSync(path.join(ROOT, 'public', path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'public', rel), buf);
  cache.set(url, rel);
  return rel;
}

async function localizeAll(html, css, dir) {
  const urls = new Set();
  for (const m of (html + '\n' + css).matchAll(/https?:\/\/[^"'()\s,]+\.(?:elfsightcdn\.com|ytimg\.com|googleusercontent\.com|ggpht\.com)[^"'()\s]*|https?:\/\/(?:[a-z0-9-]+\.)*(?:elfsightcdn\.com|ytimg\.com|googleusercontent\.com|ggpht\.com)\/[^"'()\s]*/gi)) urls.add(m[0].replace(/&quot;.*$/, ''));
  for (const u of urls) {
    const local = await localize(u, dir);
    if (local) { html = html.split(u).join(local); css = css.split(u).join(local); }
  }
  return { html, css };
}

function scopeCss(css, media) {
  return media ? `@media ${media}{${css}}` : css;
}

function cleanCommon($) {
  $('a[href*="elfsight.com"]').remove(); // "Free widget by Elfsight" / branding links
  $('[class*="Branding"], [class*="branding"], .yottie-error, [class*="WatermarkLogo"]').remove();
  $('script').remove();
}

const summary = [];
for (const [id, kind] of Object.entries(KIND)) {
  const cap = JSON.parse(fs.readFileSync(path.join(CAP, `${id}.json`), 'utf8'));
  const settings = JSON.parse(fs.readFileSync(path.join(SET, `${id}.json`), 'utf8')).data.widgets[id].data.settings;
  const dir = { gallery: 'team', youtube: 'youtube', form: FORM_KIND[id] }[kind];
  const out = { id, kind, page: cap.page, capturedAt: cap.capturedAt, variants: [] };

  if (kind === 'gallery') {
    // One markup (classes are shared); the masonry absolute positions become a CSS grid (3 columns > 768px, else 2).
    const $ = cheerio.load(cap.views.desktop.html, null, false);
    cleanCommon($);
    $('[style]').each((_, el) => {
      const st = ($(el).attr('style') || '').replace(/(position|left|top|width|height)\s*:[^;]+;?/g, '').trim();
      if (st) $(el).attr('style', st); else $(el).removeAttr('style');
    });
    $('.eapp-photo-gallery-item-grid-component').addClass('ds-elf-grid');
    $('.eapp-photo-gallery-masonry-item-item').addClass('ds-elf-grid-item');
    // full-size images (lightbox) from the originals in Elfsight's file storage
    const items = [];
    const imgs = $('.eapp-photo-gallery-item-data-image').toArray();
    for (let i = 0; i < imgs.length; i++) {
      const src = settings.images[i]?.file?.data;
      const title = $(imgs[i]).closest('.eapp-photo-gallery-masonry-item-item').find('.eapp-photo-gallery-info-title').text().trim();
      const desc = $(imgs[i]).closest('.eapp-photo-gallery-masonry-item-item').find('.eapp-photo-gallery-info-description').text().trim();
      let display = null, full = null;
      if (src?.url) {
        src.name ||= decodeURIComponent(src.url.split('/').pop().split('?')[0]) || `team-${i + 1}.png`;
        const origDir = path.join(ROOT, 'media-originals/elfsight/team');
        fs.mkdirSync(origDir, { recursive: true });
        const origFile = path.join(origDir, src.name);
        if (!fs.existsSync(origFile)) {
          const r = await fetch(src.url);
          if (r.ok) fs.writeFileSync(origFile, Buffer.from(await r.arrayBuffer()));
        }
        if (fs.existsSync(origFile)) {
          const base = src.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-');
          const pub = path.join(ROOT, 'public/elfsight/team');
          fs.mkdirSync(pub, { recursive: true });
          await sharp(origFile).rotate().resize({ width: 900, height: 900, fit: 'cover' }).webp({ quality: 82 }).toFile(path.join(pub, `${base}-900.webp`));
          await sharp(origFile).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(pub, `${base}-2048.webp`));
          display = `/elfsight/team/${base}-900.webp`;
          full = `/elfsight/team/${base}-2048.webp`;
        }
      }
      if (display) $(imgs[i]).attr('src', display).attr('width', '900').attr('height', '900').attr('loading', i < 3 ? 'eager' : 'lazy').attr('decoding', 'async').removeAttr('srcset');
      $(imgs[i]).closest('.eapp-photo-gallery-item-data-component').attr('data-ds-lightbox', String(i)).attr('role', 'button').attr('tabindex', '0');
      items.push({ title, description: desc, full: full || display });
    }
    let html = $.html();
    let css = cap.views.desktop.css;
    ({ html, css } = await localizeAll(html, css, dir));
    css += `\n.ds-elf-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:${settings.gridGutter ?? 10}px;height:auto!important}` +
      `\n@media (max-width:768px){.ds-elf-grid{grid-template-columns:repeat(${settings.gridColumnsTablet ?? 2},minmax(0,1fr));gap:${settings.gridGutterTablet ?? settings.gridGutter ?? 10}px}}` +
      `\n@media (max-width:480px){.ds-elf-grid{grid-template-columns:repeat(${settings.gridColumnsMobile ?? 2},minmax(0,1fr));gap:${settings.gridGutterMobile ?? settings.gridGutter ?? 10}px}}` +
      `\n.ds-elf-grid-item{position:relative!important;width:auto!important;left:auto!important;top:auto!important}` +
      `\n.ds-elf-grid .eapp-photo-gallery-item-data-imageContainer{aspect-ratio:1/1}.ds-elf-grid .eapp-photo-gallery-item-data-image{width:100%;height:100%;object-fit:cover}`;
    out.variants.push({ media: null, html, css });
    out.lightbox = items;
  }

  if (kind === 'youtube') {
    const $ = cheerio.load(cap.views.desktop.html, null, false);
    cleanCommon($);
    $('.yottie-widget-header-subscribe').remove(); // YouTube subscribe iframe (third-party script); the channel link stays
    const videos = [];
    $('.yottie-widget-video').each((i, el) => {
      const $el = $(el);
      const vid = $el.attr('data-yt-id');
      const title = $el.find('.yottie-widget-video-preview').attr('title') || $el.find('img').attr('alt') || '';
      videos.push({ id: vid, title });
      $el.removeAttr('style');
      $el.find('[style]').each((_, s) => {
        const st = ($(s).attr('style') || '').replace(/(width|height|margin[a-z-]*)\s*:[^;]+;?/g, '').trim();
        if (st) $(s).attr('style', st); else $(s).removeAttr('style');
      });
      $el.find('img').each((_, im) => { $(im).attr('loading', i < 4 ? 'eager' : 'lazy').attr('decoding', 'async').attr('width', '480').attr('height', '360').removeAttr('data-src').removeAttr('data-maxres-src'); });
      $el.find('a.yottie-widget-video-preview, a[href*="watch?v="]').attr('data-ds-video', vid);
    });
    // One flat track with every video (Yottie spreads them over swiper "sections"); grid on desktop, swipeable row below.
    const feed = $('.yottie-widget-feed').first();
    const cards = $('.yottie-widget-video').toArray().map((el) => $.html(el));
    feed.addClass('ds-yt-feed').empty()
      .append(`<div class="ds-yt-track" data-ds-yt-track>${cards.join('')}</div>`)
      .append('<div class="ds-yt-nav"><button type="button" class="ds-yt-prev" aria-label="Previous videos">&#8249;</button><button type="button" class="ds-yt-next" aria-label="Next videos">&#8250;</button></div>');
    $('.yottie-widget-nav').remove();
    let html = $.html();
    let css = cap.views.desktop.css;
    ({ html, css } = await localizeAll(html, css, dir));
    // Desktop (> 1024px): 4-column grid like the widget; below: a swipeable row (3 / 2 / 1 cards visible), as on the live site.
    css += `\n.ds-yt-feed{position:relative}.ds-yt-nav{justify-content:center;gap:12px;margin-top:14px}.ds-yt-nav button{width:40px;height:40px;border-radius:50%;border:1px solid rgba(0,0,0,.2);background:#fff;font-size:24px;line-height:1;cursor:pointer;color:#111}` +
      `\n.ds-yt-track{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}` +
      `\n.ds-yt-track .yottie-widget-video{width:auto!important;margin:0!important}` +
      `\n.ds-yt-track .yottie-widget-video-preview-thumbnail{display:block;width:100%!important;height:auto!important;aspect-ratio:16/9;overflow:hidden}` +
      `\n.ds-yt-track .yottie-widget-video-preview-thumbnail img{width:100%;height:100%;object-fit:cover}` +
      `\n.ds-yt-nav{display:none}` +
      `\n@media (max-width:1024px){.ds-yt-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;gap:20px}.ds-yt-track::-webkit-scrollbar{display:none}` +
      `.ds-yt-track .yottie-widget-video{flex:0 0 calc((100% - 40px)/3);scroll-snap-align:start}.ds-yt-nav{display:flex}}` +
      `\n@media (max-width:768px){.ds-yt-track .yottie-widget-video{flex-basis:calc((100% - 20px)/2)}}` +
      `\n@media (max-width:380px){.ds-yt-track .yottie-widget-video{flex-basis:100%}}`;
    out.variants.push({ media: null, html, css });
    out.videos = videos;
  }

  if (kind === 'form') {
    for (const [name, media] of [['desktop', '(min-width: 481px)'], ['mobile', '(max-width: 480px)']]) {
      const view = cap.views[name];
      const $ = cheerio.load(view.html, null, false);
      cleanCommon($);
      if (name === 'mobile') {
        $('[id]').each((_, el) => { $(el).attr('id', $(el).attr('id') + '-m'); });
        $('[for]').each((_, el) => { $(el).attr('for', $(el).attr('for') + '-m'); });
      }
      $('form').attr('data-ds-elfsight-form', FORM_KIND[id]).attr('novalidate', '');
      let html = $.html();
      let css = view.css;
      ({ html, css } = await localizeAll(html, css, dir));
      out.variants.push({ media, html, css });
    }
    out.form = {
      kind: FORM_KIND[id],
      successTitle: settings.submitMessageTitle || 'Thank you!',
      successText: settings.submitMessageText || '',
      fields: (settings.fields || []).filter((f) => !['paragraph', 'heading'].includes(f.type)).map((f) => ({ type: f.type, label: (f.label || f.name || '').trim(), required: !!f.required })),
    };
  }

  fs.writeFileSync(path.join(OUT_DATA, `${id}.json`), JSON.stringify(out));
  summary.push(`${kind} ${id.slice(0, 8)}: ${out.variants.map((v) => v.html.length + '+' + v.css.length).join(', ')} bytes`);
}

// Embed into the stored pages
let pages = 0;
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.json')) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (typeof j.html !== 'string' || !/elfsight/.test(j.html)) continue;
  j.html = embedElfsight(j.html, OUT_DATA);
  fs.writeFileSync(p, JSON.stringify(j));
  pages++;
} } };
walk(path.join(ROOT, 'content/pages'));
console.log(summary.join('\n'));
console.log('pages updated', pages);

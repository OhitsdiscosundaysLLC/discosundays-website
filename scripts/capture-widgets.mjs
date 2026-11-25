// Captures the rendered markup + CSS of third-party widgets that only run on Shopify
// (Reputon Google reviews) so they can be re-rendered natively, identically.
// Usage: node scripts/capture-widgets.mjs <siteDir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('playwright');
const site = process.argv[2] || '.';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://discosundays.com/', { waitUntil: 'load', timeout: 90000 });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } });
await p.waitForSelector('.reputon-google-reviews-widget *', { timeout: 30000 });
await p.waitForTimeout(4000);
const cap = await p.evaluate(() => {
  const w = document.querySelector('.reputon-google-reviews-widget');
  const host = w.closest('.shopify-app-block') || w.parentElement;
  const css = [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => /reputon|go\d{6,}/.test(t)).join('\n');
  const describe = (e, d = 0, out = []) => { if (d > 7) return out; for (const c of e.children) { out.push('  '.repeat(d) + c.tagName.toLowerCase() + '.' + (typeof c.className === 'string' ? c.className.split(' ').slice(0, 4).join('.') : '') + ' ' + Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height)); describe(c, d + 1, out); } return out; };
  return { html: host.innerHTML, css, tree: describe(host).slice(0, 80).join('\n') };
});
// localise review avatars / logos
const urls = [...new Set([...cap.html.matchAll(/(?:src|href)="(https:\/\/[^"]+\.(?:googleusercontent|gstatic|reputon|cdn\.shopify)[^"]*)"/g)].map((m) => m[1]).concat([...cap.html.matchAll(/src="(https:\/\/lh\d\.googleusercontent\.com\/[^"]+)"/g)].map((m) => m[1])))];
fs.mkdirSync(path.join(site, 'public/vendor/reputon'), { recursive: true });
let i = 0;
for (const u of urls) {
  try {
    const r = await fetch(u.replace(/&amp;/g, '&'));
    if (!r.ok) continue;
    const ext = (r.headers.get('content-type') || '').includes('png') ? 'png' : (r.headers.get('content-type') || '').includes('svg') ? 'svg' : 'jpg';
    const f = `/vendor/reputon/img-${i++}.${ext}`;
    fs.writeFileSync(path.join(site, 'public' + f), Buffer.from(await r.arrayBuffer()));
    cap.html = cap.html.split(u).join(f);
  } catch {}
}
cap.html = cap.html.replace(/<script[\s\S]*?<\/script>/g, '');
// Review data (from the widget's embedded JSON) with avatars stored locally
const raw = await p.evaluate(() => document.querySelector('script.reputon-google-widget-data')?.textContent || null);
const zlib = await import('node:zlib');
const parsed = raw ? JSON.parse(raw) : null;
const data = !parsed ? null : typeof parsed.data === 'string' ? JSON.parse(zlib.gunzipSync(Buffer.from(parsed.data, 'base64')).toString()) : parsed.data;
const biz = data?.business?.[0];
const reviews = [];
fs.mkdirSync(path.join(site, 'public/vendor/reputon/avatars'), { recursive: true });
for (const [k, r] of (biz?.reviews || []).entries()) {
  let photo = null;
  try {
    const res = await fetch(r.profilePhotoUrl);
    if (res.ok) { photo = `/vendor/reputon/avatars/${k}.jpg`; fs.writeFileSync(path.join(site, 'public' + photo), Buffer.from(await res.arrayBuffer())); }
  } catch {}
  reviews.push({ name: r.authorName, url: r.authorUrl, photo, rating: r.rating, time: r.relativeTimeDescription, text: r.text });
}
cap.reviews = reviews;
cap.business = biz ? { name: biz.name, rating: biz.rating, url: `https://maps.google.com/maps?cid=${biz.cid}` } : null;
fs.mkdirSync(path.join(site, 'content/widgets'), { recursive: true });
fs.writeFileSync(path.join(site, 'content/widgets/google-reviews.json'), JSON.stringify({ capturedAt: new Date().toISOString(), html: cap.html, css: cap.css, reviews: cap.reviews, business: cap.business }));
// ---------- Judge.me product reviews (rendered by a Shopify-only loader) ----------
{
  const prods = JSON.parse(fs.readFileSync(path.join(site, 'content/products.json'), 'utf8')).products;
  const jm = { css: '', widgets: {}, badges: {} };
  const grabOne = async (url) => {
    await p.goto(url, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(5000);
    return p.evaluate(() => {
      const out = { widgets: {}, badges: {}, css: '' };
      document.querySelectorAll('.jdgm-widget.jdgm-review-widget[data-id], .jdgm-review-widget[data-id]').forEach((e) => { if (e.innerHTML.trim()) out.widgets[e.getAttribute('data-id')] = e.innerHTML; });
      document.querySelectorAll('.jdgm-preview-badge[data-id], .jdgm-widget.jdgm-preview-badge[data-id]').forEach((e) => { if (e.innerHTML.trim() && !out.badges[e.getAttribute('data-id')]) out.badges[e.getAttribute('data-id')] = e.innerHTML; });
      // Only the anonymous inline block: #jdgm-settings-style / #jdgm-miracle-styles are already in the page HTML.
      out.css = [...document.querySelectorAll('style')].filter((x) => !x.id && !x.className && /jdgm/.test(x.textContent)).map((x) => x.textContent).join('\n');
      out.links = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).filter((h) => /judge/i.test(h));
      return out;
    });
  };
  for (const url of ['https://discosundays.com/collections/all', ...prods.map((x) => `https://discosundays.com/products/${x.handle}`)]) {
    const r = await grabOne(url);
    Object.assign(jm.badges, r.badges);
    Object.assign(jm.widgets, r.widgets);
    if (r.css.length > jm.css.length) jm.css = r.css;
    jm.links = [...new Set([...(jm.links || []), ...(r.links || [])])];
  }
  // The widget's own stylesheets (Judge.me theme extension: widget_v3_base.css, widget_v3_main.css), in page order,
  // followed by the inline customisation block — the same cascade the live page has.
  const linked = [];
  for (const href of jm.links || []) {
    try { const res = await fetch(href); if (res.ok) linked.push(await res.text()); } catch {}
  }
  jm.cssSource = [...(jm.links || []).map((h) => h.split('/').pop()), 'inline'];
  jm.css = [...linked, jm.css].join('\n');
  delete jm.links;
  // localise review images / avatars
  fs.mkdirSync(path.join(site, 'public/vendor/judgeme'), { recursive: true });
  let k = 0;
  const seen = new Map();
  const localise = async (html) => {
    for (const m of [...html.matchAll(/(?:src|data-src|href)=["'](https:\/\/(?:judgeme|[a-z0-9.-]*judge\.me|cdn\.judge\.me)[^"']+\.(?:jpe?g|png|webp|gif)[^"']*)["']/gi)]) {
      const u = m[1];
      if (!seen.has(u)) {
        try { const r = await fetch(u); if (r.ok) { const f = `/vendor/judgeme/${k++}.${(u.match(/\.(jpe?g|png|webp|gif)/i) || [, 'jpg'])[1]}`; fs.writeFileSync(path.join(site, 'public' + f), Buffer.from(await r.arrayBuffer())); seen.set(u, f); } } catch {}
      }
      if (seen.has(u)) html = html.split(u).join(seen.get(u));
    }
    return html;
  };
  for (const g of ['widgets', 'badges']) for (const id of Object.keys(jm[g])) jm[g][id] = await localise(jm[g][id]);
  fs.writeFileSync(path.join(site, 'content/widgets/judgeme.json'), JSON.stringify(jm));
  console.log('judgeme widgets', Object.keys(jm.widgets).length, 'badges', Object.keys(jm.badges).length, 'css', jm.css.length, 'images', k);
}
console.log('html', cap.html.length, 'css', cap.css.length, 'images', i, 'reviews', cap.reviews.length);
await b.close();

// Visual + functional comparison between the live Shopify site and the rebuild.
// Usage: node scripts/visual-compare.mjs <rebuildBaseUrl> [outDir] [pathsCsv]
import fs from 'node:fs';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = process.argv[3] || 'vt-out';
const LIVE = 'https://discosundays.com';
const PATHS = (process.argv[4] || '/,/pages/services,/pages/gallery,/pages/shop,/pages/projects,/blogs/news,/pages/team,/pages/artist-press-kit-epk,/pages/about,/pages/contact,/pages/remote-mixing,/pages/refunds-and-cancellation-policy,/policies/privacy-policy,/collections/all,/products/recording-session,/products/unisex-disco-sundays-hoodie,/blogs/news/full-interview-w-ceo-melvin-thomas,/cart,/search,/es').split(',');
const VIEWPORTS = { desktop: [1440, 900], tablet: [768, 1024], mobile: [390, 844] };
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, url, file) {
  const errors = [];
  const failed = [];
  page.removeAllListeners('console'); page.removeAllListeners('requestfailed'); page.removeAllListeners('response');
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400 && new URL(r.url()).host === new URL(url).host) failed.push(r.status() + ' ' + r.url().slice(0, 160)); });
  try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); } catch (e) { errors.push('goto: ' + e.message.slice(0, 120)); }
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '.preloader{display:none!important} *,*:before,*:after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important} #chatbase-bubble-button,#chatbase-bubble-window,[id^=chatbase]{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('.preloader').forEach((e) => e.remove()); document.querySelectorAll('video').forEach((v) => { try { v.pause(); v.currentTime = 0; } catch {} }); });
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, title: document.title, links: document.querySelectorAll('a[href]').length, imgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 10) }));
  await page.screenshot({ path: file, fullPage: true });
  return { errors, failed, ...metrics };
}

function diff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)); const B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width); const h = Math.min(A.height, B.height, 12000);
  const crop = (P) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(P, o, 0, 0, w, h, 0, 0); return o; };
  const ca = crop(A), cb = crop(B), d = new PNG({ width: w, height: h });
  const n = pixelmatch(ca.data, cb.data, d.data, w, h, { threshold: 0.15 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return { diffPct: +(100 * n / (w * h)).toFixed(2), liveH: A.height, newH: B.height };
}

const browser = await chromium.launch();
const report = [];
for (const [vp, [w, h]] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'America/New_York', userAgent: vp === 'desktop' ? undefined : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  for (const p of PATHS) {
    const slug = (p.replace(/[^a-z0-9]+/gi, '_') || 'home').replace(/^_|_$/g, '') || 'home';
    const lf = `${OUT}/${slug}.${vp}.live.png`, nf = `${OUT}/${slug}.${vp}.new.png`;
    const live = await shot(page, LIVE + p, lf);
    const neu = await shot(page, BASE + p, nf);
    const d = diff(lf, nf, `${OUT}/${slug}.${vp}.diff.png`);
    const row = { path: p, viewport: vp, ...d, titleMatch: live.title === neu.title, liveTitle: live.title, newTitle: neu.title, liveScrollW: live.w, newScrollW: neu.w, liveLinks: live.links, newLinks: neu.links, newErrors: neu.errors, newFailed: neu.failed, newBrokenImgs: neu.imgs, liveErrors: live.errors.length };
    report.push(row);
    console.log(vp, p, 'diff', d.diffPct + '%', 'h', d.liveH, '/', d.newH, 'links', live.links, '/', neu.links, 'errs', neu.errors.length, 'fail', neu.failed.length);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));

// Section-level comparison: every .shopify-section is matched by id on the live site and the rebuild,
// screenshotted, pixel-diffed and its text compared.
// Usage: node scripts/section-compare.mjs <rebuildBaseUrl> <path> [width]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const [BASE, P, W = '1440'] = process.argv.slice(2);
const b = await chromium.launch();
async function grab(url) {
  const ctx = await b.newContext({ viewport: { width: +W, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(3000);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
  await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '.preloader{display:none!important}*{animation-play-state:paused!important;transition:none!important}[id^=chatbase]{display:none!important}' });
  const secs = await p.evaluate(() => [...document.querySelectorAll('.shopify-section, [data-island]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.getAttribute('data-island'), y: r.top + scrollY, h: Math.round(r.height), w: Math.round(r.width), text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 400), imgs: e.querySelectorAll('img').length, broken: [...e.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth && i.getAttribute('src')).length }; }));
  const shots = {};
  for (const s of secs) {
    if (!s.id || s.h < 4 || s.h > 6000) continue;
    try { const el = await p.$(`[id="${s.id}"]`); if (el) shots[s.id] = await el.screenshot({ timeout: 10000 }); } catch {}
  }
  await ctx.close();
  return { secs, shots };
}
const L = await grab('https://discosundays.com' + P);
const N = await grab(BASE + P);
for (const s of L.secs) {
  const n = N.secs.find((x) => x.id === s.id);
  let d = '-';
  if (n && L.shots[s.id] && N.shots[s.id]) {
    const A = PNG.sync.read(L.shots[s.id]), B = PNG.sync.read(N.shots[s.id]);
    const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
    const c = (X) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(X, o, 0, 0, w, h, 0, 0); return o; };
    d = (100 * pixelmatch(c(A).data, c(B).data, null, w, h, { threshold: 0.15 }) / (w * h)).toFixed(1) + '%';
  }
  const tl = s.text, tn = n?.text || '';
  console.log(`${(s.id || '').replace('shopify-section-', '').slice(0, 60).padEnd(60)} h ${s.h}/${n ? n.h : 'MISSING'} diff ${d} img ${s.imgs}/${n?.imgs} broken ${n?.broken ?? '-'}${tl === tn ? '' : '\n    TEXT live: ' + tl.slice(0, 160) + '\n    TEXT new : ' + tn.slice(0, 160)}`);
}
for (const n of N.secs) if (!L.secs.find((s) => s.id === n.id)) console.log('EXTRA in rebuild:', n.id, n.h);
await b.close();

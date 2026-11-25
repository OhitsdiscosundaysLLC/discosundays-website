// Captures every Elfsight widget as rendered on the live site (markup + the CSS rules that style it, at
// desktop/tablet/mobile widths) so they can be rebuilt natively without Elfsight.
// Usage: node scripts/capture-elfsight.mjs <outDir>   (needs Playwright + network)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2] || 'elfsight-capture';
const WIDGETS = [
  ['994ebbff-c4a5-4bed-aca1-94b0a512c760', '/pages/team'],
  ['363e1a3e-bff4-4665-b2e0-caa699fdb19d', '/pages/projects'],
  ['a837ee3e-c0c0-48c0-9836-e69955cc55a8', '/pages/artist-press-kit-epk'],
  ['7b28fc37-1130-482c-9f49-05404b4e5dbf', '/pages/remote-mixing'],
  ['56e46520-6220-4d74-9b11-0b9d070477b7', '/'],
];
const WIDTHS = { desktop: 1440, tablet: 768, mobile: 390 };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const [id, pagePath] of WIDGETS) {
  const out = { id, page: pagePath, capturedAt: new Date().toISOString(), views: {} };
  for (const [name, width] of Object.entries(WIDTHS)) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('https://discosundays.com' + pagePath, { waitUntil: 'load', timeout: 90000 });
    await page.evaluate(async (id) => {
      const host = document.querySelector(`[class*="elfsight-app-${id}"]`);
      for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
      host?.scrollIntoView();
    }, id);
    await page.waitForTimeout(7000);
    out.views[name] = await page.evaluate((id) => {
      const host = document.querySelector(`[class*="elfsight-app-${id}"]`);
      if (!host) return null;
      const tokens = new Set();
      host.querySelectorAll('*').forEach((el) => el.classList.forEach((c) => tokens.add(c)));
      const keep = (sel) => [...tokens].some((t) => sel.includes('.' + t));
      const rules = [];
      const walk = (list, wrap) => {
        for (const r of list) {
          if (r.cssRules && r.media) walk(r.cssRules, (x) => wrap(`@media ${r.media.mediaText}{${x}}`));
          else if (r.cssRules && r.conditionText !== undefined) walk(r.cssRules, (x) => wrap(`@supports ${r.conditionText}{${x}}`));
          else if (r.type === 5 /* font-face */ || r.type === 7 /* keyframes */) { if (/eapps|es-|elfsight/i.test(r.cssText)) rules.push(wrap(r.cssText)); }
          else if (r.selectorText && keep(r.selectorText)) rules.push(wrap(r.cssText));
        }
      };
      for (const s of document.styleSheets) { try { walk(s.cssRules, (x) => x); } catch { /* cross-origin */ } }
      const imgs = [...host.querySelectorAll('img')].map((i) => i.currentSrc || i.src);
      const bgs = [...host.querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundImage).filter((b) => b && b !== 'none');
      const r = host.getBoundingClientRect();
      return { height: Math.round(r.height), width: Math.round(r.width), html: host.innerHTML, css: [...new Set(rules)].join('\n'), imgs, bgs };
    }, id);
    await page.close();
  }
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(out));
  const d = out.views.desktop;
  console.log(id.slice(0, 8), pagePath, d ? `h=${d.height} html=${d.html.length} css=${d.css.length} imgs=${d.imgs.length}` : 'not rendered');
}
await browser.close();

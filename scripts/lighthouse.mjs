// Lighthouse (mobile + desktop) for a set of pages. Writes a JSON summary with the performance score and
// Core Web Vitals lab metrics. Usage: node scripts/lighthouse.mjs <baseUrl> <out.json> [pathsCsv] [shareToken]
// Needs: npm i -D lighthouse chrome-launcher, and a Chromium (CHROME_PATH or Playwright's).
import fs from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const [BASE, OUT = 'lighthouse.json', PATHS = '/,/pages/services,/products/recording-session,/pages/team,/pages/projects,/blogs/news', SHARE] = process.argv.slice(2);
const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const results = [];
for (const p of PATHS.split(',')) {
  for (const formFactor of ['mobile', 'desktop']) {
    const url = BASE + p + (SHARE ? (p.includes('?') ? '&' : '?') + '_vercel_share=' + SHARE : '');
    const config = formFactor === 'desktop'
      ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }, onlyCategories: ['performance'] } }
      : { extends: 'lighthouse:default', settings: { onlyCategories: ['performance'] } };
    try {
      const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error' }, config);
      const a = r.lhr.audits;
      const row = {
        path: p, formFactor,
        score: Math.round((r.lhr.categories.performance.score || 0) * 100),
        LCP: a['largest-contentful-paint']?.numericValue, FCP: a['first-contentful-paint']?.numericValue,
        TBT: a['total-blocking-time']?.numericValue, CLS: a['cumulative-layout-shift']?.numericValue,
        SI: a['speed-index']?.numericValue, bytes: a['total-byte-weight']?.numericValue, requests: a['network-requests']?.details?.items?.length,
      };
      results.push(row);
      console.log(JSON.stringify(row));
    } catch (e) { console.log(p, formFactor, 'failed', String(e).slice(0, 160)); }
  }
}
await chrome.kill();
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

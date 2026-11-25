// Functional test suite for the rebuilt site. Usage: node scripts/functional-test.mjs <baseUrl> [shareToken]
import { chromium } from 'playwright';
const [BASE, SHARE] = process.argv.slice(2);
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
if (SHARE) await page.goto(`${BASE}/?_vercel_share=${SHARE}`, { waitUntil: 'load' });
const req = ctx.request;
const status = async (p, opts = {}) => (await req.get(BASE + p, { maxRedirects: 0, ...opts })).status();

// 1. every route answers 200
const routes = ['/', '/pages/services', '/pages/gallery', '/pages/shop', '/pages/projects', '/blogs/news', '/blogs/news?page=2', '/pages/team', '/pages/artist-press-kit-epk', '/pages/about', '/pages/contact', '/pages/remote-mixing', '/pages/refunds-and-cancellation-policy', '/policies/privacy-policy', '/policies/terms-of-service', '/policies/refund-policy', '/collections', '/collections/all', '/collections/frontpage', '/collections/services', '/collections/studio', '/collections/booking', '/collections/apparel', '/collections/physical-products', '/cart', '/search', '/agents.md',
  ...['1-hour-full-production-session', 'book-engineering-session', 'book-podcasting-voice-over-session', 'consultation-session', 'custom-beat-making-service', 'unisex-disco-sundays-hoodie', 'full-production-session', 'mastering', 'mixing-session', 'performance-videos', 'post-production', 'recording-session', 'rehearsal-space'].map((h) => '/products/' + h),
  ...['full-interview-w-ceo-melvin-thomas', 'jason-geise-the-country-music-rebel-you-need-to-know-about', 'for-immediate-release-welovesteam-announces-exciting-new-album-chasing-castles', '%F0%9F%8E%B6-introducing-houston-2-el-paso', 'lord-i-pray-single-by-jason-geise', 'alex-micheal-baby-girl', 'devil-at-the-crossroads-by-jason-geise', 'sour-by-woovierx2-disco-sundays-live-sessions', 'the-art-of-scaring-movie-sound-design-preview', 'brooke-aint-no-sunshine-disco-sundays', 'liar-by-favour-glory-disco-sundays-no-color'].map((a) => '/blogs/news/' + a)];
let bad = [];
for (const r of routes) { for (const p of [r, r === '/' ? '/es' : '/es' + r]) { if (p === '/es/agents.md') continue; const s = await status(p); if (s !== 200) bad.push(p + ' ' + s); } }
ok(`all ${routes.length * 2 - 1} EN+ES URLs return 200`, bad.length === 0, bad.join(', '));
ok('unknown URL returns 404', (await status('/does-not-exist')) === 404);
const red = await req.get(BASE + '/pages/record-label', { maxRedirects: 0 });
ok('/pages/record-label 301 → /pages/team', [301, 308].includes(red.status()) && /\/pages\/team$/.test(red.headers().location || ''), red.status() + ' ' + red.headers().location);
const sm = await (await req.get(BASE + '/sitemap.xml')).text();
ok('sitemap.xml lists pages', (sm.match(/<loc>/g) || []).length > 80, (sm.match(/<loc>/g) || []).length + ' URLs');
const rb = await (await req.get(BASE + '/robots.txt')).text();
ok('robots.txt blocks crawling until indexing is enabled', /Disallow: \/\s*$/m.test(rb) || process.env.EXPECT_INDEXING === '1', rb.split('\n').slice(0, 2).join(' | '));

// 2. SEO tags
await page.goto(BASE + '/pages/services', { waitUntil: 'load' });
const seo = await page.evaluate(() => ({ t: document.title, d: document.querySelector('meta[name=description]')?.content, c: document.querySelector('link[rel=canonical]')?.href, og: document.querySelector('meta[property="og:image"]')?.content, hl: document.querySelectorAll('link[hreflang]').length }));
ok('title / description / canonical / og:image / hreflang on pages', !!(seo.t && seo.d && seo.c && seo.og && seo.hl >= 2), JSON.stringify(seo).slice(0, 200));

// 3. assets: no broken images on key pages
for (const p of ['/', '/pages/services', '/pages/gallery', '/products/recording-session', '/blogs/news']) {
  await page.goto(BASE + p, { waitUntil: 'load' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await page.waitForTimeout(1500);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && !/paralax-[34]/.test(i.src)).map((i) => i.src).slice(0, 5));
  ok(`no broken images on ${p}`, broken.length === 0, broken.join(' '));
}
const vid = await req.head(BASE + '/shop/videos/9eded3e3e92c4447bab8ebea33be653f.mp4');
ok('preserved video served', vid.status() === 200, vid.headers()['content-type']);

// 4. product: variant switch, add to cart, cart page, checkout link
await page.goto(BASE + '/products/recording-session', { waitUntil: 'load' });
await page.waitForTimeout(2000);
const radios = await page.$$('variant-radios input[type=radio], variant-selects select');
if (radios.length > 1) {
  await page.evaluate(() => { const r = document.querySelectorAll('variant-radios input[type=radio]'); const t = r[1]; if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.waitForTimeout(2500);
}
const price = await page.evaluate(() => document.querySelector('product-info [id^="price-"] .price-item--regular, [id^="price-template"] .price-item--regular')?.textContent?.trim());
ok('variant switch updates price', /\$120\.00/.test(price || ''), price);
const reviewsShown = await page.evaluate(() => { const w = document.querySelector('.jdgm-rev-widg'); return w ? Math.round(w.getBoundingClientRect().height) : 0; });
ok('Judge.me reviews visible on product', reviewsShown > 200, reviewsShown + 'px');
await page.evaluate(async () => { document.querySelector('product-recommendations')?.scrollIntoView(); await new Promise((r) => setTimeout(r, 2500)); });
const related = await page.evaluate(() => document.querySelectorAll('product-recommendations .grid__item, product-recommendations li').length);
ok('related products load', related > 0, related + ' items');
await page.evaluate(() => { const f = document.querySelector('product-form form'); const btn = f?.querySelector('button[name=add],[type=submit]'); btn ? btn.click() : f?.requestSubmit(); });
await page.waitForTimeout(3500);
ok('add to cart navigates to /cart', /\/cart$/.test(new URL(page.url()).pathname), page.url());
const cartTxt = await page.evaluate(() => document.querySelector('#ds-cart')?.innerText || '');
ok('cart shows the added item', /Recording Session/.test(cartTxt) && /\$120\.00/.test(cartTxt), cartTxt.replace(/\s+/g, ' ').slice(0, 120));
const cartJson = await page.evaluate(async () => (await fetch('/cart.js')).json());
ok('/cart.js reflects cart', cartJson.item_count === 1, 'items ' + cartJson.item_count);
await page.route('**/disco-sundays.myshopify.com/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
const [nav] = await Promise.all([page.waitForRequest((r) => /myshopify\.com\/cart\//.test(r.url()), { timeout: 8000 }).catch(() => null), page.click('#checkout').catch(() => null)]);
ok('checkout hands off to Shopify cart permalink', !!nav && /\/cart\/\d+:1/.test(nav.url()), nav ? nav.url().slice(0, 140) : 'no navigation');
await page.goto(BASE + '/cart', { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('#ds-cart .cart-remove-button a')?.click());
await page.waitForTimeout(800);
const empty = await page.evaluate(() => { const c = document.querySelector('cart-items:not([hidden])'); return c?.classList.contains('is-empty') && getComputedStyle(c).display !== 'none'; });
ok('removing item shows the theme empty-cart state', !!empty);

// 5. search
await page.goto(BASE + '/search?q=mixing', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const sr = await page.evaluate(() => document.querySelector('.template-search__results-count')?.textContent || '');
ok('search returns results', /\d+ result/.test(sr), sr);

// 6. forms: contact posts to /api/contact (expected 503 until email is configured)
await page.goto(BASE + '/pages/contact', { waitUntil: 'load' });
await page.waitForTimeout(3000);
const pify = await page.evaluate(() => { const f = document.querySelector('#form-iframe-14563, iframe[src*="pifyapp"]'); return f ? Math.round(f.getBoundingClientRect().height) : 0; });
ok('PifyApp contact form iframe loads', pify > 300, pify + 'px');
const apiRes = await page.evaluate(async () => (await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page: '/test', fields: { email: 'test@example.com', body: 'automated test' } }) })).status);
ok('contact API answers honestly (503 until RESEND is configured, 200 after)', [200, 503].includes(apiRes), 'HTTP ' + apiRes);
const formShowsMsg = await page.evaluate(async () => {
  const f = document.querySelector('form[data-island-form="contact"]'); if (!f) return 'no form';
  f.querySelectorAll('input[type=email]').forEach((i) => (i.value = 'test@example.com'));
  f.requestSubmit(); await new Promise((r) => setTimeout(r, 2500));
  return f.querySelector('.ds-form-status')?.textContent || 'no status';
});
ok('Shopify-style contact form shows a status message', formShowsMsg !== 'no status' && formShowsMsg !== 'no form', formShowsMsg.slice(0, 90));

// 7. reviews carousel
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.evaluate(async () => { scrollTo(0, document.body.scrollHeight); await new Promise((r) => setTimeout(r, 1500)); });
const rev = await page.evaluate(() => ({ cards: document.querySelectorAll('[data-island="google-reviews"] .reputon-card').length, h: Math.round(document.querySelector('[data-island="google-reviews"]')?.getBoundingClientRect().height || 0) }));
ok('Google reviews carousel rendered (23 reviews + summary)', rev.cards >= 20 && rev.h > 300, JSON.stringify(rev));
const moved = await page.evaluate(async () => { const t = document.querySelector('[data-island="google-reviews"] .swiper-horizontal > div'); const before = t.style.transform; document.querySelector('[data-island="google-reviews"] .reputon-swiper-button-next')?.click(); await new Promise((r) => setTimeout(r, 500)); return before !== t.style.transform; });
ok('reviews carousel next button moves', moved);

// 8. mobile layout: no horizontal overflow beyond the live site's own
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
if (SHARE) await mp.goto(`${BASE}/?_vercel_share=${SHARE}`, { waitUntil: 'load' });
await mp.goto(BASE + '/', { waitUntil: 'load' });
const mw = await mp.evaluate(() => document.documentElement.scrollWidth);
ok('mobile home renders (scrollWidth matches live quirk ≈416px)', mw >= 390 && mw <= 430, mw + 'px');
await b.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
import('node:fs').then((fs) => fs.writeFileSync('functional-results.json', JSON.stringify(results, null, 1)));

// Converts crawled Shopify HTML into content files for the Next.js site.
// Usage: node transform.mjs <dlDir> <siteDir>
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const [dl, site] = process.argv.slice(2);
const crawl = JSON.parse(fs.readFileSync(path.join(dl, 'crawl.json'), 'utf8'));
const manifestPath = path.join(dl, 'asset-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// ---------- asset map ----------
const STORE = 's/files/1/0573/0471/1377';
const keyOf = (u) => {
  let p = u.replace(/^(https?:)?\/\/(www\.)?(discosundays\.com|cdn\.shopify\.com)\//, '')
    .split('?')[0].split('#')[0];
  p = p.replace(/^cdn\/shop\//, STORE + '/').replace(/^s\/files\/1\/0573\/0471\/1377\/t\/\d+\//, 't/');
  p = p.replace(new RegExp('^' + STORE.replace(/\//g, '\\/') + '\\/t\\/\\d+\\/'), 't/');
  p = p.replace(/_(\d+x\d*|\d*x\d+|\d+X|small|medium|large|grande|compact|master)(?=\.[A-Za-z0-9]+$)/i, '');
  return decodeURIComponent(p).toLowerCase();
};
const assetMap = new Map();
const pub = (local) => local.replace(/^public/, '').replace(/^theme-assets\//, '/theme/');
for (const a of manifest) {
  if (/\/_v\//.test(a.local)) continue; // resized variants are derived from originals, never used as originals
  const local = a.webRendition || a.local; // HEIC -> browser-renderable JPG rendition
  assetMap.set(keyOf(a.fetchedFrom || a.source), pub(local));
}
const missing = new Map(); // url -> local path to download

function localFor(url) {
  if (/\/videos\/c\/vp\//.test(url)) {
    const id = url.match(/\/vp\/([a-f0-9]+)\//)[1];
    const loc = `public/shop/videos/${id}.mp4`;
    if (!fs.existsSync(path.join(site, loc)) && !missing.has(url.split('?')[0])) missing.set('https:' + url.replace(/^https?:/, '').split('?')[0].replace('//discosundays.com/cdn/shop/', '//cdn.shopify.com/'), loc);
    return '/' + loc.replace(/^public\//, '');
  }
  const k = keyOf(url);
  if (assetMap.has(k)) return assetMap.get(k);
  let m;
  let loc;
  if ((m = k.match(/^t\/assets\/(.+)$/))) loc = 'public/theme/' + m[1];
  else if ((m = k.match(/^s\/files\/1\/0573\/0471\/1377\/(files|products|articles|collections)\/(.+)$/))) loc = `public/shop/${m[1]}/${m[2]}`;
  else if ((m = k.match(/^extensions\/[^/]+\/([^/]+)\/assets\/(.+)$/))) loc = `public/vendor/${m[1]}/${m[2]}`;
  else return null;
  // original-case filename for download + on disk
  const orig = url.split('?')[0].split('#')[0];
  const name = decodeURIComponent(orig.split('/').pop()).replace(/_(\d+x\d*|\d*x\d+|\d+X)(?=\.[A-Za-z0-9]+$)/i, '');
  loc = loc.replace(/[^/]+$/, name);
  let src = orig.replace(/^\/\//, 'https://').replace(/_(\d+x\d*|\d*x\d+|\d+X)(?=\.[A-Za-z0-9]+$)/i, '');
  missing.set(src, loc);
  const p = '/' + loc.replace(/^public\//, '');
  assetMap.set(k, p);
  return p;
}

const CDN_RE = /(?:https?:)?\/\/(?:www\.)?(?:discosundays\.com\/cdn\/shop|cdn\.shopify\.com\/(?:s\/files\/1\/0573\/0471\/1377|videos\/c\/vp|extensions))\/[^\s"'()<>\\,]+/g;
const CDN_RE_ESC = /(?:https?:)?\\\/\\\/(?:www\.)?(?:discosundays\.com\\\/cdn\\\/shop|cdn\.shopify\.com\\\/s\\\/files\\\/1\\\/0573\\\/0471\\\/1377)\\\/[^\s"'()<>,]+/g;

// Shopify serves resized variants (NAME_300x.png, ?width=800, ?crop=center&height=32).
// The theme's layout depends on those exact sizes, so each variant is stored as its own file;
// the full-resolution original is always kept as well (see asset-manifest.json).
const variantMap = new Map();
function variantFor(rawUrl) {
  const url = rawUrl.replace(/&amp;/g, '&');
  if (/\/videos\/c\/vp\//.test(url) || /\/t\/\d+\/assets\//.test(url) || /\/extensions\//.test(url)) return localFor(url);
  let u;
  try { u = new URL(url.startsWith('//') ? 'https:' + url : url); } catch { return localFor(url); }
  const name = decodeURIComponent(u.pathname.split('/').pop());
  const suf = name.match(/_(\d+x\d*|\d*x\d+|\d+X)(?=\.[A-Za-z0-9]+$)/);
  const w = u.searchParams.get('width'), h = u.searchParams.get('height'), c = u.searchParams.get('crop');
  if (!suf && !w && !h) return localFor(url);
  const orig = localFor(url); // registers the original for download
  if (!orig) return null;
  const key = [suf && suf[1].toLowerCase(), w && 'w' + w, h && 'h' + h, c && 'c' + c].filter(Boolean).join('_');
  const base = name.replace(/_(\d+x\d*|\d*x\d+|\d+X)(?=\.[A-Za-z0-9]+$)/, '');
  const dot = base.lastIndexOf('.');
  let ext = base.slice(dot);
  if (/\.heic$/i.test(ext)) ext = '.jpg';
  const dir = orig.replace(/\/[^/]+$/, '');
  const loc = `${dir}/_v/${base.slice(0, dot)}__${key}${ext}`;
  if (!variantMap.has(loc)) {
    const src = new URL(u.href);
    src.searchParams.delete('v');
    if (/\.heic$/i.test(base)) src.searchParams.set('format', 'pjpg');
    variantMap.set(loc, src.href.replace('https://discosundays.com/cdn/shop/', 'https://cdn.shopify.com/s/files/1/0573/0471/1377/'));
    missing.set(variantMap.get(loc), 'public' + loc);
  }
  return loc;
}

function rewriteUrls(s) {
  s = s.replace(CDN_RE, (u) => {
    const fixed = u.startsWith('//') ? 'https:' + u : u;
    const l = variantFor(fixed.replace('discosundays.com/cdn/shop/videos', 'cdn.shopify.com/videos'));
    return l ? encodeURI(decodeURI(l)) : u;
  });
  s = s.replace(CDN_RE_ESC, (u) => {
    const l = variantFor(u.replace(/\\\//g, '/'));
    return l ? encodeURI(decodeURI(l)).replace(/\//g, '\\/') : u;
  });
  // internal absolute links -> relative
  s = s.replace(/https?:\/\/(?:www\.)?discosundays\.com(?=[/"'#?])/g, '');
  s = s.replace(/https?:\\\/\\\/(?:www\.)?discosundays\.com(?=\\\/)/g, '');
  s = s.replace(/(["'(])\/\/(?:www\.)?discosundays\.com(?=\/)/g, '$1');
  return s;
}

// ---------- what to drop ----------
const DROP_SRC = [
  'shopifycloud', '/cdn/wpm/', 'checkouts/internal', 'shop.app', 'monorail', 'perf-kit', 'shop_events_listener',
  'consent-tracking', 'standard-actions', 'portable-wallets', 'origin-trials', 'shop-js', 'cdn.shopify.com/proxy',
  'judgeme', 'judge.me', 'reputon', 'cowlendar', 'pify', 'nfcube', 'chimpstatic', 'tiny-img-link-preloader',
  '/extensions/', 'vendor/touchpunch', 'cdn/shop/t/8/assets/new_cb.js',
];
const DROP_INLINE = [
  'ShopifyAnalytics', '__TREKKIE', 'wpmLoader', 'ShopifyPay', 'SignInWithShop', 'featureAssets', 'asyncLoad',
  'var __st', 'PaypalV4', "const t='contact'", 'webmcp', 'PaymentButton', 'portableWallets', 'performance.mark',
  'Shopify.modules', 'customDocumentWrite', 'navigator.userAgent;var platform', 'jdgm', 'chatbotId', 'chatbase',
  'Shopify.loadFeatures', 'shopify.exit_interstitial', 'cowlendar', 'Cowlendar', 'pify', 'Pify', 'reputon',
  'BOOMR', 'trekkie', 'ShopifyBuy', 'shopify-buyer-consent', 'previewBar',
];
const KEEP_JSON_CLASS = ['reputon-google-widget-data'];

function cleanup($) {
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const type = ($el.attr('type') || '').toLowerCase();
    const txt = $el.html() || '';
    const cls = $el.attr('class') || '';
    if (KEEP_JSON_CLASS.some((c) => cls.includes(c))) return;
    if (type === 'application/ld+json') return;
    if (src) { if (DROP_SRC.some((d) => src.includes(d))) $el.remove(); return; }
    if (type === 'application/json' && ($el.attr('id') === 'shopify-features' || $el.attr('id') === 'apple-pay-shop-capabilities' || $el.attr('id') === 'shop-js-analytics')) { $el.remove(); return; }
    if (type === 'speculationrules') { $el.remove(); return; }
    if (/pifyapp\.com\/form\//.test(txt)) return; // PifyApp hosted-form embed: platform independent, kept as is
    if (DROP_INLINE.some((d) => txt.includes(d))) $el.remove();
  });
  $('link').each((_, el) => {
    const $el = $(el);
    const rel = ($el.attr('rel') || '').toLowerCase();
    const href = $el.attr('href') || '';
    if (/shopifycloud\/.*policy[^/]*\.css/.test(href)) {
      const name = href.split('?')[0].split('/').pop();
      const loc = `public/vendor/shopify/${name}`;
      missing.set('https://discosundays.com' + href.replace(/^(https?:)?\/\/[^/]+/, ''), loc);
      $el.attr('href', '/vendor/shopify/' + name);
      return;
    }
    if (/prefetch|preconnect|dns-prefetch|ucp|alternate|canonical|icon|preload/.test(rel) && !/stylesheet/.test(rel)) { $el.remove(); return; }
    if (DROP_SRC.some((d) => href.includes(d)) && !href.includes('/extensions/')) $el.remove();
    if (href.includes('/extensions/') && !/\.css/.test(href)) $el.remove();
    if (href.includes('portable-wallets') || href.includes('shopifycloud')) $el.remove();
  });
  $('meta').remove();
  $('title').remove();
  $('#shopify-pc__banner, #preview-bar-iframe, .shopify-payment-button').remove();
  // <shopify-payment-terms> (Shop Pay installments banner) is kept: checkout still runs on Shopify, and
  // Shopify's own component renders it from the shopify-meta attribute on any domain (loader added in addPaymentTerms).
  $('[id^="shopify-block"]').filter((_, el) => $(el).find('.reputon-google-widget-data').length > 0).each((_, el) => {
    const json = $(el).find('script.reputon-google-widget-data').first();
    const div = $('<div data-island="google-reviews"></div>');
    if (json.length) div.append(json.clone());
    $(el).replaceWith(div);
  });
  $('.reputon-google-reviews-widget').not('[data-island] *').each((_, el) => {
    if ($(el).closest('[data-island]').length) return;
    $(el).replaceWith('<div data-island="google-reviews"></div>');
  });
  // dynamic checkout / accelerated buttons
  $('.shopify-payment-button__button, .shopify-payment-button__more-options').remove();
  // forms
  $('form[action*="/contact"]').not('[action*="/products/"]').attr('data-island-form', 'contact');
  $('form[action*="/cart/add"]').attr('data-island-form', 'cart-add');
  // cowlendar booking widget placeholders
  $('[class*="cowlendar"]').each((_, el) => {
    if ($(el).is('form')) $(el).removeAttr('data-cowlendar-form');
  });
}

// ---------- Judge.me: insert the review widgets/badges captured from the live store ----------
const jmPath = path.join(site, 'content/widgets/judgeme.json');
const JM = fs.existsSync(jmPath) ? JSON.parse(fs.readFileSync(jmPath, 'utf8')) : null;
function fillJudgeme($) {
  if (!JM) return;
  let used = false;
  $('.jdgm-review-widget[data-id]').each((_, el) => { const h = JM.widgets[$(el).attr('data-id')]; if (h) { $(el).html(h).addClass('jdgm--done-setup-widget'); used = true; } });
  $('.jdgm-preview-badge[data-id]').each((_, el) => { const h = JM.badges[$(el).attr('data-id')]; if (h) { $(el).html(h); used = true; } });
  $('.jdgm-temp-hiding-style').remove(); // normally removed by Judge.me's script once the widget is ready
  // Judge.me's script adds these classes to every badge once it is set up
  $('.jdgm-widget.jdgm-preview-badge').addClass('jdgm-preview-badge--with-link jdgm--done-setup');
  if (used) $('head').append(`<style data-judgeme>${JM.css}</style>`);
}

// ---------- Shop Pay installments banner: Shopify's public web component ----------
function addPaymentTerms($, lang) {
  if (!$('shopify-payment-terms').length) return;
  $('body').append(`<script type="module" src="https://cdn.shopify.com/shopifycloud/shop-js/modules/v2/loader.payment-terms.${lang === 'es' ? 'es' : 'en'}.esm.js"></script>`);
}

// ---------- per page ----------
const routes = {};
fs.mkdirSync(path.join(site, 'content/pages'), { recursive: true });
for (const m of crawl) {
  if (m.status !== 200 && !/404-test-page$/.test(m.path)) continue;
  if (m.path.endsWith('agents.md')) {
    fs.mkdirSync(path.join(site, 'public'), { recursive: true });
    fs.writeFileSync(path.join(site, 'public/agents.md'), rewriteUrls(fs.readFileSync(path.join(dl, m.file), 'utf8')));
    continue;
  }
  const raw = fs.readFileSync(path.join(dl, m.file), 'utf8');
  const $ = cheerio.load(raw, { decodeEntities: false });
  const meta = {
    path: m.path,
    status: m.status,
    lang: $('html').attr('lang') || (m.path.startsWith('/es') ? 'es' : 'en'),
    title: $('head > title').first().text().replace(/\s+/g, ' ').trim(),
    description: $('meta[name="description"]').attr('content') || '',
    canonical: ($('link[rel="canonical"]').attr('href') || '').replace(/^https?:\/\/(www\.)?discosundays\.com/, '') || null,
    og: {},
    twitter: {},
    jsonld: [],
    bodyClass: $('body').attr('class') || '',
    bodyStyle: $('body').attr('style') || '',
    htmlClass: ($('html').attr('class') || '').replace('no-js', 'js'),
  };
  $('meta[property^="og:"]').each((_, el) => { meta.og[$(el).attr('property').slice(3)] = rewriteUrls($(el).attr('content') || ''); });
  $('meta[name^="twitter:"]').each((_, el) => { meta.twitter[$(el).attr('name').slice(8)] = $(el).attr('content') || ''; });
  $('script[type="application/ld+json"]').each((_, el) => { meta.jsonld.push(rewriteUrls($(el).html().trim())); $(el).remove(); });
  cleanup($);
  fillJudgeme($);
  addPaymentTerms($, meta.lang.slice(0, 2));
  const headAssets = $('head').children().toArray().map((el) => $.html(el)).join('\n');
  const body = $('body').html();
  const html = rewriteUrls(headAssets + '\n' + body)
    .replace(/<!--(?!\s*(BEGIN|END) )[\s\S]*?-->/g, '');
  const key = (m.path === '/' ? 'index' : m.path.replace(/^\//, ''))
    .replace(/\?page=(\d+)/, '__page-$1').replace(/%/g, '_');
  const file = `content/pages/${key}.json`;
  fs.mkdirSync(path.dirname(path.join(site, file)), { recursive: true });
  fs.writeFileSync(path.join(site, file), JSON.stringify({ ...meta, html }));
  routes[m.path] = file;
}
fs.writeFileSync(path.join(site, 'content/routes.json'), JSON.stringify(routes, null, 1));

// ---------- product data (public Shopify products feed) + search index ----------
{
  const prods = [];
  for (let page = 1; page < 10; page++) {
    const r = await fetch(`https://discosundays.com/products.json?limit=250&page=${page}`);
    const j = await r.json();
    if (!j.products?.length) break;
    prods.push(...j.products);
  }
  for (const p of prods) {
    p.body_html = rewriteUrls(p.body_html || '');
    p.images = p.images.map((im) => ({ ...im, local: localFor(im.src) }));
    p.variants = p.variants.map((v) => ({ ...v, featured_image: v.featured_image ? { ...v.featured_image, local: localFor(v.featured_image.src) } : null }));
  }
  fs.writeFileSync(path.join(site, 'content/products.json'), JSON.stringify({ products: prods }));
  const index = [];
  for (const [p, file] of Object.entries(routes)) {
    if (/404-test-page|\/cart$|\/search$|\?/.test(p)) continue;
    const pg = JSON.parse(fs.readFileSync(path.join(site, file), 'utf8'));
    const $$ = cheerio.load(pg.html);
    $$('script,style,noscript,header,footer,.header-wrap').remove();
    const text = ($$('main').text() || $$.root().text()).replace(/\s+/g, ' ').trim().slice(0, 3000);
    const type = /\/products\//.test(p) ? 'product' : /\/blogs\/news\/./.test(p) ? 'article' : 'page';
    const handle = (p.match(/\/products\/([^/?]+)/) || [])[1];
    const prod = handle && prods.find((x) => x.handle === decodeURIComponent(handle));
    index.push({ url: p, title: pg.og.title || pg.title.split(' &ndash;')[0], type, image: pg.og.image ? new URL(pg.og.image, 'https://x').pathname : undefined, text, price: prod ? '$' + prod.variants[0].price : undefined, lang: pg.lang.startsWith('es') ? 'es' : 'en' });
  }
  fs.writeFileSync(path.join(site, 'content/search-index.json'), JSON.stringify(index));
  console.log('products', prods.length, 'index', index.length);
}

// ---------- product recommendations (Shopify section rendering API, fetched by the theme) ----------
{
  const done = new Set();
  fs.mkdirSync(path.join(site, 'content/recommendations'), { recursive: true });
  for (const m of crawl) {
    if (!/\/products\//.test(m.path) || m.status !== 200) continue;
    const raw = fs.readFileSync(path.join(dl, m.file), 'utf8');
    const rec = raw.match(/\/recommendations\/products\?section_id=([^"&]+)&(?:amp;)?product_id=(\d+)&(?:amp;)?limit=(\d+)/);
    if (!rec) continue;
    const lang = m.path.startsWith('/es/') ? 'es' : 'en';
    const key = `${lang}-${rec[2]}`;
    if (done.has(key)) continue;
    done.add(key);
    const r = await fetch(`https://discosundays.com${lang === 'es' ? '/es' : ''}/recommendations/products?section_id=${rec[1]}&product_id=${rec[2]}&limit=${rec[3]}`);
    if (!r.ok) { console.log('recommendations failed', key, r.status); continue; }
    const $r = cheerio.load(await r.text(), { decodeEntities: false });
    cleanup($r);
    fillJudgeme($r);
    if (JM) $r('body').prepend(`<style data-judgeme>${JM.css}</style>`);
    fs.writeFileSync(path.join(site, `content/recommendations/${key}.html`), rewriteUrls($r('body').html() || ''));
  }
  console.log('recommendations', done.size);
}

// ---------- fetch assets discovered during rewrite ----------
const list = [...missing.entries()];
console.log('pages', Object.keys(routes).length, 'new assets', list.length);
let fail = [];
await Promise.all(Array.from({ length: 10 }, async () => {
  while (list.length) {
    const [src, loc] = list.shift();
    const dest = path.join(site, decodeURIComponent(loc));
    if (fs.existsSync(dest)) continue;
    const tries = [src, src.replace('https://cdn.shopify.com/s/files/1/0573/0471/1377/', 'https://discosundays.com/cdn/shop/')];
    let ok = false;
    for (const t of tries) {
      try {
        const r = await fetch(t);
        if (!r.ok) continue;
        const b = Buffer.from(await r.arrayBuffer());
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, b);
        manifest.push({ source: t, local: loc, kind: /\/_v\//.test(loc) ? 'variant' : 'discovered', status: 200, bytes: b.length, contentType: r.headers.get('content-type'), fetchedFrom: t });
        ok = true; break;
      } catch {}
    }
    if (!ok) fail.push(src + ' -> ' + loc);
  }
}));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log('failed', fail.length); fail.slice(0, 40).forEach((f) => console.log('  ', f));

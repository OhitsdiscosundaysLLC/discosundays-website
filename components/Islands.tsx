'use client';

import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { addLine, changeLine, clearCart, findVariant, money, productByHandle, toShopifyJson, updateCart } from '@/lib/cart';
import CartPage from './islands/CartPage';
import GoogleReviews from './islands/GoogleReviews';
import SearchResults from './islands/SearchResults';
import { bindContactForms } from './islands/contactForms';
import { bindJudgeme } from './islands/judgeme';
import { bindProductForms } from './islands/productForms';
import { bindPrintfulEdt } from './islands/printfulEdt';

declare global {
  interface Window { __dsShim?: boolean; routes?: Record<string, string>; __dsOrigFetch?: typeof fetch; __dsHandle?: (i: RequestInfo | URL, o?: RequestInit) => Promise<Response> }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function bodyToObject(init?: RequestInit): Promise<Record<string, unknown>> {
  const b = init?.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return Object.fromEntries(new URLSearchParams(b)); }
  }
  if (b instanceof FormData) {
    const o: Record<string, unknown> = {};
    const props: Record<string, string> = {};
    b.forEach((v, k) => {
      const m = k.match(/^properties\[(.+)\]$/);
      if (m) { if (String(v)) props[m[1]] = String(v); } else o[k] = v;
    });
    if (Object.keys(props).length) o.properties = props;
    return o;
  }
  if (b instanceof URLSearchParams) return Object.fromEntries(b);
  return {};
}

/** Replaces Shopify's storefront AJAX endpoints used by the theme scripts. */
function installShim() {
  if (window.__dsShim) return;
  window.__dsShim = true;
  // The boot script in ShopifyPage intercepts these requests from the very first moment and queues them
  // until this handler exists, so clicks made before React hydrates are handled too.
  const orig = (window.__dsOrigFetch || window.fetch).bind(window);
  window.__dsHandle = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
    if (url.origin !== location.origin) return orig(input, init);
    const p = url.pathname.replace(/^\/es(?=\/)/, '');
    const method = (init?.method || 'GET').toUpperCase();
    if (/^\/cart\/add(\.js)?$/.test(p) && method === 'POST') {
      const o = await bodyToObject(init);
      const items = (o.items as { id: number; quantity?: number; properties?: Record<string, string> }[]) || [{ id: Number(o.id), quantity: Number(o.quantity || 1), properties: o.properties as Record<string, string> }];
      const added = [];
      for (const it of items) {
        if (!findVariant(Number(it.id))) return json({ status: 422, message: 'Cart Error', description: 'Variant not found' }, 422);
        added.push(addLine(Number(it.id), Number(it.quantity || 1), it.properties));
      }
      return json(o.items ? { items: added } : added[0]);
    }
    if (/^\/cart(\.js|\.json)$/.test(p)) return json(toShopifyJson());
    if (/^\/cart\/change(\.js)?$/.test(p)) {
      const o = await bodyToObject(init);
      return json(changeLine({ line: o.line ? Number(o.line) : undefined, id: o.id as string }, Number(o.quantity)));
    }
    if (/^\/cart\/update(\.js)?$/.test(p)) {
      const o = await bodyToObject(init);
      return json(updateCart(o.updates as Record<string, number>, o.note as string | undefined, o.attributes as Record<string, string>));
    }
    if (/^\/cart\/clear(\.js)?$/.test(p)) return json(clearCart());
    // Variant switch on product pages: theme re-fetches the section for the chosen variant.
    const prod = p.match(/^\/products\/([^/]+)$/);
    if (prod && url.searchParams.get('section_id') && url.searchParams.get('variant')) {
      const res = await orig(url.pathname);
      const html = await res.text();
      return new Response(applyVariant(html, prod[1], Number(url.searchParams.get('variant')), url.searchParams.get('section_id')!), { headers: { 'content-type': 'text/html' } });
    }
    if (prod && p.endsWith('.js')) {
      const pr = productByHandle(prod[1].replace(/\.js$/, ''));
      return pr ? json(pr) : orig(input, init);
    }
    return orig(input, init);
  };
  if (!window.__dsOrigFetch) {
    const h = window.__dsHandle;
    window.fetch = (i: RequestInfo | URL, o?: RequestInit) => h(i, o);
  }
}

function applyVariant(html: string, handle: string, variantId: number, sectionId: string) {
  const pr = productByHandle(decodeURIComponent(handle));
  const v = pr?.variants.find((x) => x.id === variantId);
  if (!v) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const price = money(Math.round(parseFloat(v.price) * 100)) + ' USD';
  doc.querySelectorAll('[id^="price-"] .price-item--regular, [id^="price-"] .price-item--sale').forEach((el) => { el.textContent = price; });
  doc.querySelectorAll('[id^="price-"] .price').forEach((el) => el.classList.toggle('price--sold-out', !v.available));
  doc.querySelectorAll('input[name="id"]').forEach((el) => el.setAttribute('value', String(v.id)));
  doc.querySelectorAll('shopify-payment-terms').forEach((el) => el.setAttribute('variant-id', String(v.id)));
  // Like Shopify's section rendering API, answer with the requested section only.
  const section = doc.getElementById(`shopify-section-${sectionId}`);
  return section ? section.outerHTML : '<!doctype html>' + doc.documentElement.outerHTML;
}

function mount(el: Element, node: React.ReactNode, roots: Root[]) {
  if ((el as HTMLElement).dataset.dsMounted) return;
  (el as HTMLElement).dataset.dsMounted = '1';
  const r = createRoot(el);
  r.render(node);
  roots.push(r);
}

export default function Islands({ lang, path }: { lang: string; path: string }) {
  useEffect(() => {
    installShim();
    const roots: Root[] = [];
    document.querySelectorAll('[data-island="google-reviews"]').forEach((el) => {
      const data = el.querySelector('script.reputon-google-widget-data')?.textContent || null;
      mount(el, <GoogleReviews raw={data} />, roots);
    });
    const cartItems = document.querySelector('cart-items');
    if (cartItems && /\/cart$/.test(path)) {
      const host = document.createElement('div');
      host.id = 'ds-cart';
      cartItems.parentElement!.insertBefore(host, cartItems);
      const originals = [cartItems, ...Array.from(document.querySelectorAll('#main-cart-footer, [id$="__cart-footer"]'))];
      mount(host, <CartPage lang={lang} originals={originals} />, roots);
    }
    if (/\/search$/.test(path)) {
      const host = document.querySelector('.template-search__results, .template-search') || document.querySelector('main');
      if (host) {
        const div = document.createElement('div');
        host.appendChild(div);
        mount(div, <SearchResults lang={lang} />, roots);
      }
    }
    const unbind = bindContactForms();
    const unbindJm = bindJudgeme();
    const unbindPf = bindProductForms(lang);
    const unbindEdt = bindPrintfulEdt(lang);
    return () => { unbind(); unbindJm(); unbindPf(); unbindEdt(); roots.forEach((r) => setTimeout(() => r.unmount())); };
  }, [lang, path]);
  return null;
}

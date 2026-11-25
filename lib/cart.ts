'use client';
// Client-side replacement for Shopify's AJAX Cart API (/cart.js, /cart/add.js, /cart/change.js ...).
// Checkout is handed to Shopify with a cart permalink, so orders, payments and customer records stay in Shopify.
import products from '@/content/products.json';

export type ShopifyVariant = { id: number; title: string; price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null; featured_image?: { src: string } | null };
export type ShopifyProduct = { id: number; title: string; handle: string; product_type: string; vendor: string; options: { name: string; values: string[] }[]; variants: ShopifyVariant[]; images: { src: string; id: number }[] };

const PRODUCTS = (products as { products: ShopifyProduct[] }).products;
const KEY = 'ds_cart_v1';

export type CartLine = { id: number; quantity: number; properties?: Record<string, string> };
type Stored = { lines: CartLine[]; note: string; attributes: Record<string, string>; token: string };

export function findVariant(id: number) {
  for (const p of PRODUCTS) {
    const v = p.variants.find((x) => x.id === Number(id));
    if (v) return { product: p, variant: v };
  }
  return null;
}
export const productByHandle = (h: string) => PRODUCTS.find((p) => p.handle === h) || null;
export const allProducts = () => PRODUCTS;

function read(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.lines)) return s;
  } catch {}
  return { lines: [], note: '', attributes: {}, token: Math.random().toString(36).slice(2) };
}
function write(s: Stored) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new CustomEvent('ds:cart', { detail: toShopifyJson(s) }));
}

const cents = (p: string) => Math.round(parseFloat(p) * 100);
const imgLocal = (src?: string) => {
  if (!src) return null;
  const name = decodeURIComponent(src.split('?')[0].split('/').pop() || '').replace(/\.heic$/i, '.jpg');
  const kind = src.includes('/products/') ? 'products' : 'files';
  return `/shop/${kind}/${name}`;
};
const lineKey = (l: CartLine) => `${l.id}:${l.properties ? btoa(unescape(encodeURIComponent(JSON.stringify(l.properties)))).slice(0, 16) : ''}`;

export function toShopifyJson(s: Stored = read()) {
  const items = s.lines.flatMap((l) => {
    const f = findVariant(l.id);
    if (!f) return [];
    const price = cents(f.variant.price);
    const image = imgLocal(f.variant.featured_image?.src || f.product.images[0]?.src);
    return [{
      id: l.id, variant_id: l.id, key: lineKey(l), quantity: l.quantity, properties: l.properties || {},
      title: f.product.variants.length > 1 || f.variant.title !== 'Default Title' ? `${f.product.title} - ${f.variant.title}` : f.product.title,
      product_title: f.product.title, variant_title: f.variant.title === 'Default Title' ? null : f.variant.title,
      product_id: f.product.id, handle: f.product.handle, url: `/products/${f.product.handle}?variant=${l.id}`,
      price, original_price: price, final_price: price, line_price: price * l.quantity, original_line_price: price * l.quantity, final_line_price: price * l.quantity,
      image, featured_image: image ? { url: image, alt: f.product.title } : null,
      options_with_values: f.product.options.map((o, i) => ({ name: o.name, value: [f.variant.option1, f.variant.option2, f.variant.option3][i] })),
      product_has_only_default_variant: f.product.variants.length === 1 && f.variant.title === 'Default Title',
      discounts: [], requires_shipping: f.product.product_type !== 'Service', vendor: f.product.vendor,
    }];
  });
  const total = items.reduce((a, i) => a + i.final_line_price, 0);
  return {
    token: s.token, note: s.note, attributes: s.attributes, original_total_price: total, total_price: total,
    total_discount: 0, total_weight: 0, item_count: items.reduce((a, i) => a + i.quantity, 0), items,
    requires_shipping: items.some((i) => i.requires_shipping), currency: 'USD', items_subtotal_price: total, cart_level_discount_applications: [],
  };
}

export function addLine(id: number, quantity = 1, properties?: Record<string, string>) {
  const s = read();
  const props = properties && Object.keys(properties).length ? properties : undefined;
  const k = lineKey({ id, quantity, properties: props });
  const ex = s.lines.find((l) => lineKey(l) === k);
  if (ex) ex.quantity += quantity; else s.lines.push({ id, quantity, properties: props });
  write(s);
  return toShopifyJson(s).items.find((i) => i.key === k);
}

/** line is 1-based index or key/variant id (Shopify semantics). */
export function changeLine(ref: { line?: number; id?: string | number }, quantity: number) {
  const s = read();
  let idx = -1;
  if (ref.line) idx = ref.line - 1;
  else if (ref.id != null) idx = s.lines.findIndex((l) => lineKey(l) === String(ref.id) || l.id === Number(ref.id));
  if (idx >= 0 && s.lines[idx]) {
    if (quantity <= 0) s.lines.splice(idx, 1); else s.lines[idx].quantity = quantity;
  }
  write(s);
  return toShopifyJson(s);
}

export function updateCart(updates?: Record<string, number> | number[], note?: string, attributes?: Record<string, string>) {
  const s = read();
  if (Array.isArray(updates)) updates.forEach((q, i) => { if (s.lines[i]) s.lines[i].quantity = q; });
  else if (updates) for (const [id, q] of Object.entries(updates)) { const l = s.lines.find((x) => x.id === Number(id) || lineKey(x) === id); if (l) l.quantity = q; }
  s.lines = s.lines.filter((l) => l.quantity > 0);
  if (note != null) s.note = note;
  if (attributes) s.attributes = { ...s.attributes, ...attributes };
  write(s);
  return toShopifyJson(s);
}

export function clearCart() { const s = read(); s.lines = []; write(s); return toShopifyJson(s); }

export const money = (c: number) => '$' + (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Shopify cart permalink: https://shop/cart/VID:QTY,VID:QTY?note=..&attributes[k]=v */
export function checkoutUrl() {
  const s = read();
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN || 'disco-sundays.myshopify.com';
  const merged = new Map<number, number>();
  s.lines.forEach((l) => merged.set(l.id, (merged.get(l.id) || 0) + l.quantity));
  const parts = [...merged.entries()].map(([id, q]) => `${id}:${q}`).join(',');
  const qs = new URLSearchParams();
  const attrs: Record<string, string> = { ...s.attributes };
  s.lines.forEach((l, i) => { if (l.properties) for (const [k, v] of Object.entries(l.properties)) attrs[`Item ${i + 1} ${k}`] = v; });
  if (s.note) qs.set('note', s.note);
  for (const [k, v] of Object.entries(attrs)) qs.set(`attributes[${k}]`, v);
  qs.set('ref', 'disco-sundays-website');
  return `https://${domain}/cart/${parts}?${qs.toString()}`;
}

'use client';
// Printful "Estimated delivery to <flag> <country> <dates>" line under the add-to-cart button.
// Same behaviour as Printful's storefront script (shopify-product-customizer.js), rebuilt natively:
// the theme's inline config (pfEdt, pfProductId, pfEdtFlags, …) is kept in the page, the delivery window
// comes from Printful's public endpoint (it knows the fulfilment times and the visitor's country),
// and the answer is cached in localStorage for 4 hours under the same keys Printful uses.
type PfWindow = Window & {
  pfEdt?: unknown;
  pfProductId?: unknown;
  pfSyncProductIdentity?: string;
  pfEdtFlags?: Record<string, string>;
  pfEdtUseDefaultStyling?: unknown;
  pfEdtTextColor?: string | null;
  pfEdtBackgroundColor?: string | null;
  pfEdtBorderColor?: string | null;
  pfEdtTextAlignment?: number | null;
};
type EdtResponse = { result?: { is_success?: boolean; reason_code?: string; html?: string; countryCode?: string } };

const SHOP = 'disco-sundays.myshopify.com';
const API = 'https://api.printful.com/estimate-delivery-time';
const TTL = 4 * 60 * 60 * 1000;

export function bindPrintfulEdt(lang: string): () => void {
  const w = window as PfWindow;
  const id = w.pfProductId;
  if (!w.pfEdt || !id || typeof id === 'object') return () => {};
  const form = Array.from(document.querySelectorAll<HTMLFormElement>('form[action$="/cart/add"]')).find(
    (f) => f.querySelectorAll('[type="submit"]').length > 0 ||
      f.querySelectorAll('[class*="add-to-cart"], [class*="cart-submit"], [class*="form__submit"], [class*="submit"]').length > 0,
  );
  if (!form || form.querySelector(':scope > .edt')) return () => {};

  const locale = lang === 'es' ? 'es' : 'en';
  const ident = w.pfSyncProductIdentity ? '_' + w.pfSyncProductIdentity : '';
  const dataKey = `${locale}_${id}${ident}`;
  const timeKey = `${locale}_edtCached_${id}${ident}`;
  let el: HTMLDivElement | null = null;
  let cancelled = false;

  const render = (r: EdtResponse) => {
    if (cancelled || !r.result?.html) return;
    el = document.createElement('div');
    el.className = 'edt';
    Object.assign(el.style, { width: '100%', textAlign: 'center', marginTop: '8px', padding: '0 8px' });
    if (w.pfEdtUseDefaultStyling) {
      const p = document.querySelector<HTMLElement>('p');
      if (p?.style.color) el.style.color = p.style.color;
    } else {
      if (w.pfEdtTextColor) el.style.color = w.pfEdtTextColor;
      if (w.pfEdtBackgroundColor) el.style.backgroundColor = w.pfEdtBackgroundColor;
      if (w.pfEdtBorderColor) el.style.border = '1px solid ' + w.pfEdtBorderColor;
      const align = ({ 0: 'center', 1: 'left', 2: 'right' } as Record<number, string>)[w.pfEdtTextAlignment as number];
      if (align) el.style.textAlign = align;
    }
    const flag = r.result.countryCode ? w.pfEdtFlags?.[r.result.countryCode] : undefined;
    el.innerHTML = r.result.html.replace('{img}', flag ? `<img src="${flag}" style="height: 1em; width: 1.5em; margin-bottom: -0.125em;">` : '');
    form.appendChild(el);
  };

  try {
    const cached = localStorage.getItem(dataKey);
    if (cached && Date.now() - TTL < Number(localStorage.getItem(timeKey))) {
      render(JSON.parse(cached));
      return () => { cancelled = true; el?.remove(); };
    }
  } catch { /* storage unavailable */ }

  const url = `${API}?productId=${encodeURIComponent(String(id))}&locale=${locale}&storeIdentity=${SHOP}` +
    (w.pfSyncProductIdentity ? `&productIdentity=${encodeURIComponent(w.pfSyncProductIdentity)}` : '');
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal })
    .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
    .then((text) => {
      const r = JSON.parse(text) as EdtResponse;
      if (!r.result || (!r.result.is_success && r.result.reason_code === 'internal_server_error')) return;
      try { localStorage.setItem(dataKey, text); localStorage.setItem(timeKey, String(Date.now())); } catch { /* ignore */ }
      render(r);
    })
    .catch(() => { /* no estimate shown, as with Printful's script */ });
  return () => { cancelled = true; ctrl.abort(); el?.remove(); };
}

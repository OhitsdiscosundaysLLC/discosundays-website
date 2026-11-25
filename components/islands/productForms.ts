'use client';
// Native behaviour for the theme's product forms, equivalent to Shopify's:
// - choosing options updates price, availability, the hidden variant id and ?variant= in the URL
// - "Add to cart" stores the line and opens /cart (what Shopify does when the theme has no cart drawer)
import { addLine, money, productByHandle, type ShopifyVariant } from '@/lib/cart';

export function bindProductForms(lang: string): () => void {
  const offs: (() => void)[] = [];
  const m = location.pathname.match(/\/products\/([^/?#]+)/);
  const product = m ? productByHandle(decodeURIComponent(m[1])) : null;
  const prefix = lang === 'es' ? '/es' : '';

  const selected = (): ShopifyVariant | undefined => {
    if (!product) return;
    const values: string[] = [];
    document.querySelectorAll('variant-radios fieldset, variant-selects .product-form__input, product-info fieldset').forEach((fs) => {
      const checked = fs.querySelector<HTMLInputElement>('input[type=radio]:checked');
      const sel = fs.querySelector<HTMLSelectElement>('select');
      const v = checked?.value ?? sel?.value;
      if (v != null && !values.includes(v)) values.push(v);
    });
    if (!values.length) return;
    return product.variants.find((v) => [v.option1, v.option2, v.option3].filter((x) => x != null).every((o, i) => o === values[i]));
  };

  const apply = (v: ShopifyVariant) => {
    const price = money(Math.round(parseFloat(v.price) * 100)) + ' USD';
    document.querySelectorAll('[id^="price-"] .price-item--regular, [id^="price-"] .price-item--sale').forEach((el) => { el.textContent = price; });
    document.querySelectorAll('[id^="price-"] .price').forEach((el) => el.classList.toggle('price--sold-out', !v.available));
    document.querySelectorAll<HTMLInputElement>('product-form input[name="id"], form[action*="/cart/add"] input[name="id"]').forEach((i) => { i.value = String(v.id); i.disabled = false; });
    document.querySelectorAll('shopify-payment-terms').forEach((el) => el.setAttribute('variant-id', String(v.id)));
    document.querySelectorAll<HTMLButtonElement>('product-form button[name="add"]').forEach((b) => {
      b.disabled = !v.available;
      b.toggleAttribute('aria-disabled', !v.available);
    });
    const u = new URL(location.href);
    u.searchParams.set('variant', String(v.id));
    history.replaceState(history.state, '', u.toString());
  };

  const onChange = (e: Event) => {
    const t = e.target as Element;
    if (!t.closest('variant-radios, variant-selects, product-info fieldset')) return;
    setTimeout(() => { const v = selected(); if (v) apply(v); }, 0);
  };
  document.addEventListener('change', onChange, true);
  offs.push(() => document.removeEventListener('change', onChange, true));

  const onSubmit = (e: Event) => {
    const form = e.target as HTMLFormElement;
    if (!(form instanceof HTMLFormElement) || !/\/cart\/add/.test(form.getAttribute('action') || '') || !form.closest('product-form')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const fd = new FormData(form);
    const id = Number(fd.get('id')) || selected()?.id;
    if (!id) return;
    const props: Record<string, string> = {};
    fd.forEach((v, k) => { const mm = k.match(/^properties\[(.+)\]$/); if (mm && typeof v === 'string' && v) props[mm[1]] = v; });
    const qtyInput = document.querySelector<HTMLInputElement>('quantity-input input[name="quantity"], input[name="quantity"][form="' + form.id + '"]');
    addLine(id, Math.max(1, Number(fd.get('quantity') || qtyInput?.value || 1)), props);
    location.href = prefix + '/cart';
  };
  document.addEventListener('submit', onSubmit, true);
  offs.push(() => document.removeEventListener('submit', onSubmit, true));

  // The theme keeps the button aria-disabled while third-party booking widgets load; clicking it must still add.
  const onClick = (e: Event) => {
    const b = (e.target as Element).closest?.('product-form button[name="add"]') as HTMLButtonElement | null;
    if (!b || b.disabled) return;
    const form = b.closest('form') || (b.form as HTMLFormElement | null);
    if (form) { e.preventDefault(); e.stopImmediatePropagation(); form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
  };
  document.addEventListener('click', onClick, true);
  offs.push(() => document.removeEventListener('click', onClick, true));

  // Initial state from ?variant=
  const qv = Number(new URLSearchParams(location.search).get('variant'));
  const initial = product?.variants.find((v) => v.id === qv);
  if (initial) apply(initial);
  return () => offs.forEach((o) => o());
}

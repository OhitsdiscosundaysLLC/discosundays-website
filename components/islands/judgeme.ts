'use client';
// Minimal native behaviour for the Judge.me review widget markup captured from the live store:
// "Write a review" toggles the form, star inputs work, and submissions are delivered through /api/contact
// (Judge.me's own submission endpoint is tied to the Shopify app, so new reviews arrive by email and are
// added in Judge.me by the store owner).
export function bindJudgeme(): () => void {
  const offs: (() => void)[] = [];
  const on = (el: Element, ev: string, fn: EventListener) => { el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); };
  document.querySelectorAll('.jdgm-rev-widg').forEach((w) => {
    const form = w.querySelector<HTMLElement>('.jdgm-form-wrapper');
    w.querySelectorAll('.jdgm-write-rev-link').forEach((b) => on(b, 'click', (e) => {
      e.preventDefault();
      if (form) form.style.display = form.style.display === 'block' ? 'none' : 'block';
    }));
    w.querySelectorAll('.jdgm-form__rating a, .jdgm-form__rating span[data-alt]').forEach((star, i, all) => on(star, 'click', (e) => {
      e.preventDefault();
      all.forEach((s, j) => { s.classList.toggle('jdgm--on', j <= i); s.classList.toggle('jdgm--off', j > i); });
      const inp = w.querySelector<HTMLInputElement>('input[name="review_score"], input[name="rating"]');
      if (inp) inp.value = String(i + 1);
    }));
    w.querySelectorAll<HTMLFormElement>('form').forEach((f) => on(f, 'submit', async (e) => {
      e.preventDefault();
      const fields: Record<string, string> = { product: document.querySelector('h1')?.textContent?.trim() || '', product_id: w.closest('[data-id]')?.getAttribute('data-id') || '' };
      new FormData(f).forEach((v, k) => { if (typeof v === 'string') fields[k] = v; });
      f.querySelectorAll<HTMLInputElement>('input[type=email]').forEach((i) => { fields.email = i.value; });
      let ok = false;
      try { ok = (await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ form: 'review', lang: document.documentElement.lang === 'es' ? 'es' : 'en', page: location.pathname, fields }) })).ok; } catch {}
      const es = document.documentElement.lang === 'es';
      f.parentElement?.querySelectorAll('.ds-review-status').forEach((n) => n.remove());
      const msg = document.createElement('div');
      msg.className = 'jdgm-form__thankyou ds-review-status';
      msg.setAttribute('role', ok ? 'status' : 'alert');
      msg.textContent = ok
        ? (es ? '¡Gracias por enviar tu reseña!' : 'Thank you for submitting a review!')
        : (es ? 'Lo sentimos, no se pudo enviar tu reseña. Inténtalo de nuevo más tarde.' : 'Sorry, your review could not be submitted right now. Please try again later.');
      if (ok) f.replaceWith(msg); else f.before(msg); // keep the form (and what was typed) when sending fails
    }));
  });
  // Like Judge.me's script: size classes from the widget's own width (measured on the live store:
  // < 450px → --small, < 680px → --medium, wider → none). Its CSS uses them, e.g. to drop side padding.
  const widgets = Array.from(document.querySelectorAll<HTMLElement>('.jdgm-review-widget'));
  const size = (el: HTMLElement) => {
    const w = el.getBoundingClientRect().width;
    if (!w) return;
    el.classList.toggle('jdgm-review-widget--small', w < 450);
    el.classList.toggle('jdgm-review-widget--medium', w >= 450 && w < 680);
  };
  widgets.forEach(size);
  if (widgets.length && 'ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((en) => size(en.target as HTMLElement)));
    widgets.forEach((el) => ro.observe(el));
    offs.push(() => ro.disconnect());
  }
  return () => offs.forEach((o) => o());
}

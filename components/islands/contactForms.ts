'use client';
// Replaces Shopify's native contact form endpoint (POST /contact) with /api/contact.
// Success and error states reuse the theme's own form-status markup.
const MSG = {
  en: { ok: 'Thanks for contacting us. We\'ll get back to you as soon as possible.', err: 'Sorry, your message could not be sent right now. Please email us directly or try again later.' },
  es: { ok: 'Gracias por contactarnos. Te responderemos lo antes posible.', err: 'Lo sentimos, tu mensaje no se pudo enviar en este momento. Escríbenos directamente o inténtalo más tarde.' },
};

export function bindContactForms(): () => void {
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[data-island-form="contact"]'));
  const handlers = forms.map((form) => {
    const h = async (e: Event) => {
      e.preventDefault();
      const fd = new FormData(form);
      const fields: Record<string, string> = {};
      fd.forEach((v, k) => { if (typeof v === 'string' && !['form_type', 'utf8'].includes(k)) fields[k.replace(/^contact\[(.+)\]$/, '$1')] = v; });
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
      if (btn) btn.disabled = true;
      let ok = false;
      let detail = '';
      try {
        const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ form: 'contact', lang, page: location.pathname, fields }) });
        ok = r.ok;
        if (!ok && r.status === 422) detail = ((await r.json().catch(() => ({}))) as { error?: string }).error || '';
      } catch {}
      if (btn) btn.disabled = false;
      form.querySelectorAll('.ds-form-status').forEach((n) => n.remove());
      const status = document.createElement('h2');
      status.className = `form-status form-status-list form__message ds-form-status`;
      status.setAttribute('tabindex', '-1');
      status.setAttribute('role', ok ? 'status' : 'alert');
      status.textContent = ok ? MSG[lang].ok : detail || MSG[lang].err;
      form.prepend(status);
      status.focus();
      if (ok) form.reset();
    };
    form.addEventListener('submit', h);
    return () => form.removeEventListener('submit', h);
  });
  return () => handlers.forEach((u) => u());
}

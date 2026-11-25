import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Delivers contact-style form submissions by email through Resend.
 * Requires RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL. If they are not set the route
 * answers 503 so the form shows an error — it never reports success without delivering.
 */
export async function POST(req: Request) {
  let body: { page?: string; fields?: Record<string, string> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const fields = body.fields || {};
  if (fields['_gotcha'] || fields['website']) return NextResponse.json({ ok: true }); // honeypot
  const email = fields.email || fields['Email'] || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 422 });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!key || !to || !from) {
    console.error('[contact] email delivery is not configured (RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL)');
    return NextResponse.json({ error: 'Form delivery is not configured' }, { status: 503 });
  }
  const rows = Object.entries(fields).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0"><b>${esc(k)}</b></td><td>${esc(String(v)).replace(/\n/g, '<br>')}</td></tr>`).join('');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: to.split(',').map((s) => s.trim()), reply_to: email,
      subject: `New website form submission (${body.page || 'contact'})`,
      html: `<p>Submitted from <b>${esc(body.page || '')}</b></p><table>${rows}</table>`,
    }),
  });
  if (!r.ok) {
    console.error('[contact] Resend error', r.status, await r.text());
    return NextResponse.json({ error: 'Delivery failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

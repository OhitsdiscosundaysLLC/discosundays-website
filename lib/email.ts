// Server-only email helpers for website form notifications (Resend).
// The API key is read from the RESEND_API_KEY environment variable at request time and never reaches the browser.
import 'server-only';

export type FormKind = 'contact' | 'review' | 'epk' | 'remote-mixing';

export const FORM_LABELS: Record<FormKind, string> = {
  contact: 'Contact form',
  review: 'Product review',
  epk: 'Artist Press Kit (EPK) submission',
  'remote-mixing': 'Mixing From Anywhere request',
};

export type Attachment = { filename: string; content: string /* base64 */; contentType?: string };

export function emailConfig() {
  return {
    key: process.env.RESEND_API_KEY || '',
    to: (process.env.CONTACT_TO_EMAIL || 'ohitsdiscosundays@gmail.com').split(',').map((s) => s.trim()).filter(Boolean),
    // onboarding@resend.dev works before the domain is verified (it only delivers to the Resend account's own address).
    // After verifying discosundays.com in Resend set CONTACT_FROM_EMAIL="Disco Sundays <notifications@discosundays.com>".
    from: process.env.CONTACT_FROM_EMAIL || 'Disco Sundays <onboarding@resend.dev>',
    autoReply: process.env.CONTACT_AUTOREPLY === '1',
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const prettyKey = (k: string) => k.replace(/^contact\[(.+)\]$/, '$1').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^./, (c) => c.toUpperCase());

function layout(title: string, intro: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#000;padding:20px 28px;color:#fff;font-size:20px;font-weight:bold;letter-spacing:2px">DISCO SUNDAYS</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 8px;font-size:20px">${esc(title)}</h1>
<p style="margin:0 0 20px;color:#555;font-size:14px">${intro}</p>
${inner}
</td></tr>
<tr><td style="padding:16px 28px;background:#fafafa;color:#888;font-size:12px">Sent by the discosundays.com website.</td></tr>
</table></td></tr></table></body></html>`;
}

export function notificationEmail(kind: FormKind, fields: Record<string, string>, page: string, attachments: Attachment[]) {
  const rows = Object.entries(fields).map(([k, v]) =>
    `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-weight:bold;font-size:14px;white-space:nowrap">${esc(prettyKey(k))}</td>` +
    `<td style="padding:8px 0;font-size:14px">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  const files = attachments.length
    ? `<p style="margin:16px 0 0;font-size:14px"><b>Attached files:</b> ${attachments.map((a) => esc(a.filename)).join(', ')}</p>` : '';
  const html = layout(FORM_LABELS[kind], `New submission from <b>${esc(page || '/')}</b>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">${rows}</table>${files}`);
  const text = `${FORM_LABELS[kind]}\nPage: ${page}\n\n` +
    Object.entries(fields).map(([k, v]) => `${prettyKey(k)}: ${v}`).join('\n') +
    (attachments.length ? `\n\nAttached files: ${attachments.map((a) => a.filename).join(', ')}` : '');
  const who = fields.name || fields.Name || fields.email || fields.Email || '';
  return { subject: `${FORM_LABELS[kind]}${who ? ` from ${who}` : ''}`, html, text };
}

export function confirmationEmail(kind: FormKind, lang: 'en' | 'es') {
  const t = lang === 'es'
    ? { title: 'Hemos recibido tu mensaje', body: 'Gracias por escribir a Disco Sundays. Te responderemos lo antes posible.' }
    : { title: 'We received your message', body: 'Thanks for reaching out to Disco Sundays. We will get back to you as soon as possible.' };
  return { subject: t.title, html: layout(t.title, esc(t.body), ''), text: `${t.title}\n\n${t.body}` };
}

export async function sendEmail(msg: { to: string[]; from: string; subject: string; html: string; text: string; replyTo?: string; attachments?: Attachment[] }) {
  const { key } = emailConfig();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: msg.from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      ...(msg.attachments?.length ? { attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content, content_type: a.contentType })) } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as { id: string };
}

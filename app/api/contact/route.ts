import { NextResponse } from 'next/server';
import { confirmationEmail, emailConfig, notificationEmail, sendEmail, type Attachment, type FormKind } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Delivers every website form (contact, product review, EPK, Mixing From Anywhere) by email through Resend.
 * Accepts JSON ({ form, page, lang, fields }) or multipart/form-data (same keys + files) for uploads.
 * Answers 503 when RESEND_API_KEY is not configured, so the form shows an error — it never reports
 * success without delivering.
 */
const KINDS: FormKind[] = ['contact', 'review', 'epk', 'remote-mixing'];
const MAX_FIELDS = 40;
const MAX_FIELD_LEN = 5000;
const MAX_ATTACH_BYTES = 4 * 1024 * 1024; // Vercel functions accept request bodies up to 4.5 MB
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

// Light per-instance rate limit (5 submissions / 10 min per IP); a second layer on top of the honeypot.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const err = (status: number, error: string, code: string) => NextResponse.json({ ok: false, error, code }, { status });

export async function POST(req: Request) {
  // Same-origin only (browsers always send Origin on cross-site POSTs).
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return err(403, 'Forbidden', 'origin');

  let kind: FormKind = 'contact';
  let page = '';
  let lang: 'en' | 'es' = 'en';
  const fields: Record<string, string> = {};
  const attachments: Attachment[] = [];
  let attachBytes = 0;

  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      for (const [k, v] of fd.entries()) {
        if (k === 'form') kind = String(v) as FormKind;
        else if (k === 'page') page = String(v);
        else if (k === 'lang') lang = v === 'es' ? 'es' : 'en';
        else if (typeof v === 'string') fields[k] = v;
        else if (v.size > 0) {
          attachBytes += v.size;
          if (attachBytes > MAX_ATTACH_BYTES) return err(413, 'Files are too large (4 MB total maximum).', 'too_large');
          attachments.push({ filename: v.name.slice(0, 120), content: Buffer.from(await v.arrayBuffer()).toString('base64'), contentType: v.type || undefined });
        }
      }
    } else {
      const body = await req.json();
      kind = body.form || kind;
      page = String(body.page || '');
      lang = body.lang === 'es' ? 'es' : 'en';
      for (const [k, v] of Object.entries(body.fields || {})) fields[k] = String(v ?? '');
    }
  } catch {
    return err(400, 'Invalid request', 'bad_request');
  }
  if (!KINDS.includes(kind)) kind = 'contact';

  // Honeypots: real visitors never fill these hidden fields.
  if (fields._gotcha || fields.website || fields['contact[website]']) return NextResponse.json({ ok: true });
  for (const k of ['_gotcha', 'website', 'utf8', 'form_type']) delete fields[k];

  // Validation
  const keys = Object.keys(fields);
  if (keys.length === 0) return err(422, 'The form is empty.', 'empty');
  if (keys.length > MAX_FIELDS) return err(422, 'Too many fields.', 'too_many');
  for (const k of keys) {
    fields[k] = fields[k].trim();
    if (fields[k].length > MAX_FIELD_LEN) return err(422, 'A field is too long.', 'too_long');
    if (!fields[k]) delete fields[k];
  }
  const emailKey = Object.keys(fields).find((k) => /e-?mail/i.test(k));
  const email = emailKey ? fields[emailKey] : '';
  if (!EMAIL_RE.test(email)) return err(422, lang === 'es' ? 'Introduce un correo electrónico válido.' : 'Please enter a valid email address.', 'email');

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return err(429, 'Too many submissions. Please try again in a few minutes.', 'rate_limited');

  const cfg = emailConfig();
  if (!cfg.key) {
    console.error('[contact] RESEND_API_KEY is not set; form delivery is disabled');
    return err(503, 'Form delivery is not configured', 'not_configured');
  }

  const msg = notificationEmail(kind, fields, page, attachments);
  try {
    const sent = await sendEmail({ to: cfg.to, from: cfg.from, replyTo: email, attachments, ...msg });
    if (cfg.autoReply) {
      // Only after the sending domain is verified (onboarding@resend.dev cannot email visitors).
      await sendEmail({ to: [email], from: cfg.from, ...confirmationEmail(kind, lang) }).catch((e) => console.error('[contact] auto-reply failed', e));
    }
    return NextResponse.json({ ok: true, id: sent.id });
  } catch (e) {
    console.error('[contact] delivery failed', e);
    return err(502, 'Delivery failed', 'delivery_failed');
  }
}

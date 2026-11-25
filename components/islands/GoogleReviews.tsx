'use client';
import { useEffect, useRef } from 'react';
import widget from '@/content/widgets/google-reviews.json';

type Review = { name: string; url: string; photo: string | null; rating: number; time: string; text: string };
const W = widget as unknown as { html: string; css: string; reviews: Review[]; business: { name: string; url: string } | null };

/**
 * Native rebuild of the Reputon "Google reviews" carousel (a Shopify-only app).
 * Uses the widget's own rendered markup and CSS (captured from the live store) so it looks identical;
 * every review card is generated from the review data, and the carousel is driven here.
 */
export default function GoogleReviews({ raw }: { raw: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = `<style>${W.css}</style><div class="reputon-google-reviews-widget">${W.html}</div>`;
    const track = host.querySelector<HTMLElement>('.swiper-horizontal > div');
    const slides = track ? Array.from(track.children) as HTMLElement[] : [];
    const tplCard = host.querySelector<HTMLElement>('.reputon-single-review:not(.reputon-summary-review)');
    if (track && tplCard && slides.length) {
      const slideTpl = tplCard.parentElement as HTMLElement;
      const summary = host.querySelector<HTMLElement>('.reputon-summary-review')?.parentElement;
      // find the elements inside the template card that hold each field
      const tplText = Array.from(tplCard.querySelectorAll<HTMLElement>('*')).filter((e) => e.children.length === 0 && (e.textContent || '').length > 40).sort((a, b) => (b.textContent || '').length - (a.textContent || '').length)[0];
      track.innerHTML = '';
      if (summary) track.appendChild(summary);
      W.reviews.forEach((r) => {
        const s = slideTpl.cloneNode(true) as HTMLElement;
        const card = s.querySelector<HTMLElement>('.reputon-card')!;
        const nameEl = card.querySelector<HTMLElement>('.reputon-name');
        if (nameEl) { nameEl.textContent = r.name; if (nameEl instanceof HTMLAnchorElement) nameEl.href = r.url; }
        card.querySelectorAll<HTMLAnchorElement>('a.reputon-link').forEach((a) => { a.href = r.url; });
        const dateEl = card.querySelector<HTMLElement>('.reputon-date');
        if (dateEl) dateEl.textContent = r.time;
        const img = card.querySelector<HTMLElement>('.reputon-image img') || card.querySelector<HTMLElement>('.reputon-image');
        if (img && r.photo) {
          if (img instanceof HTMLImageElement) img.src = r.photo; else img.style.backgroundImage = `url(${r.photo})`;
        }
        if (tplText) {
          const path: number[] = [];
          let n: Element | null = tplText;
          while (n && n !== tplCard) { path.unshift(Array.prototype.indexOf.call(n.parentElement!.children, n)); n = n.parentElement; }
          let t: Element | null = card;
          for (const i of path) t = t?.children[i] || null;
          if (t) t.textContent = r.text;
        }
        track.appendChild(s);
      });
    }
    const all = track ? Array.from(track.children) as HTMLElement[] : [];
    let index = 0;
    const visible = () => {
      const w = track?.parentElement?.clientWidth || 1;
      const sw = all[0]?.getBoundingClientRect().width || w;
      return Math.max(1, Math.round(w / sw));
    };
    const prev = host.querySelector<HTMLButtonElement>('.reputon-swiper-button-prev');
    const next = host.querySelector<HTMLButtonElement>('.reputon-swiper-button-next');
    const go = (i: number) => {
      if (!track || !all.length) return;
      index = Math.max(0, Math.min(i, all.length - visible()));
      const x = all[index].offsetLeft - (all[0].offsetLeft || 0);
      track.style.transition = 'transform .3s ease';
      track.style.transform = `translate3d(${-x}px,0,0)`;
      prev?.toggleAttribute('disabled', index === 0);
      next?.toggleAttribute('disabled', index >= all.length - visible());
    };
    prev?.addEventListener('click', () => go(index - 1));
    next?.addEventListener('click', () => go(index + 1));
    // touch swipe
    let sx = 0;
    track?.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    track?.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1)); });
    const onResize = () => go(index);
    window.addEventListener('resize', onResize);
    go(0);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return <div ref={ref} className="shopify-block shopify-app-block" data-has-data={raw ? "1" : "0"} />;
}

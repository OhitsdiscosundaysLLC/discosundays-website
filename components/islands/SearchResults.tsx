'use client';
import { useEffect, useState } from 'react';
import index from '@/content/search-index.json';

type Item = { url: string; title: string; type: 'product' | 'article' | 'page'; image?: string; text: string; price?: string; lang: string };
const ITEMS = index as Item[];
const T = {
  en: { results: (n: number, q: string) => `${n} result${n === 1 ? '' : 's'} found for “${q}”`, none: (q: string) => `No results found for “${q}”. Check the spelling or use a different word or phrase.`, product: 'Product', article: 'Blog post', page: 'Page' },
  es: { results: (n: number, q: string) => `${n} resultado${n === 1 ? '' : 's'} encontrado${n === 1 ? '' : 's'} para “${q}”`, none: (q: string) => `No se encontraron resultados para “${q}”. Comprueba la ortografía o usa una palabra o frase diferente.`, product: 'Producto', article: 'Artículo del blog', page: 'Página' },
};

/** Native replacement for Shopify's server-side search over products, articles and pages. */
export default function SearchResults({ lang }: { lang: string }) {
  const L = lang === 'es' ? 'es' : 'en';
  const [q, setQ] = useState<string | null>(null);
  useEffect(() => { setQ(new URLSearchParams(location.search).get('q') || ''); }, []);
  if (q == null || !q.trim()) return null;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = ITEMS.filter((i) => i.lang === L && terms.every((t) => (i.title + ' ' + i.text).toLowerCase().includes(t)))
    .sort((a, b) => Number(b.title.toLowerCase().includes(terms[0])) - Number(a.title.toLowerCase().includes(terms[0])));
  return (
    <div className="page-width" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <p role="status" className="template-search__results-count">{hits.length ? T[L].results(hits.length, q) : T[L].none(q)}</p>
      <ul className="grid product-grid grid--2-col-tablet-down grid--4-col-desktop" role="list" style={{ marginTop: 24 }}>
        {hits.map((h) => (
          <li className="grid__item" key={h.url}>
            <div className="card-wrapper underline-links-hover">
              <div className="card card--standard card--media">
                {h.image && (
                  <div className="card__inner ratio" style={{ ['--ratio-percent' as string]: '100%' }}>
                    <div className="card__media"><div className="media media--transparent media--hover-effect">
                      <img src={h.image} alt={h.title} loading="lazy" className="motion-reduce" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div></div>
                  </div>
                )}
                <div className="card__content"><div className="card__information">
                  <span className="caption-with-letter-spacing light">{T[L][h.type]}</span>
                  <h3 className="card__heading h5"><a href={h.url} className="full-unstyled-link">{h.title}</a></h3>
                  {h.price && <div className="price"><span className="price-item price-item--regular">{h.price}</span></div>}
                </div></div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

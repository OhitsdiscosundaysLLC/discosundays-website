import type { PageContent } from '@/lib/content';
import Islands from './Islands';

/**
 * Renders a page exactly as the Shopify theme produced it.
 * The markup, the theme CSS and the theme scripts are kept verbatim (asset URLs point to local copies),
 * so layout, animations, sliders and hover effects behave identically. Shopify-only features are
 * replaced by native "islands" mounted on placeholders (see components/Islands.tsx).
 */
// Runs before any theme script: routes Shopify storefront endpoints (cart, section rendering, product .js)
// to the native handler installed by Islands, queueing calls made before hydration.
const FETCH_BOOT = `(function(){if(window.__dsOrigFetch)return;var of=window.fetch.bind(window);window.__dsOrigFetch=of;window.fetch=function(i,o){try{var u=new URL(typeof i==='string'?i:(i&&i.url)?i.url:String(i),location.href);var p=u.pathname.replace(/^\\/es(?=\\/)/,'');if(u.origin===location.origin&&(/^\\/cart(\\.js|\\.json|\\/.+)$/.test(p)||(/^\\/products\\/[^/]+$/.test(p)&&u.searchParams.get('section_id'))||/^\\/products\\/[^/]+\\.js$/.test(p))){return new Promise(function(res,rej){(function w(){window.__dsHandle?window.__dsHandle(i,o).then(res,rej):setTimeout(w,25)})()})}}catch(e){}return of(i,o)}})();`;

export default function ShopifyPage({ page }: { page: PageContent }) {
  const bodyBoot = FETCH_BOOT + `document.documentElement.className=${JSON.stringify(page.htmlClass)};document.body.className=${JSON.stringify(page.bodyClass)};document.body.setAttribute('style',${JSON.stringify(page.bodyStyle)});`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: bodyBoot }} />
      {page.jsonld.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: j }} />
      ))}
      <div id="ds-page" style={{ display: 'contents' }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <Islands lang={page.lang} path={page.path} />
    </>
  );
}

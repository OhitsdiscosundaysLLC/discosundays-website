/**
 * No-JavaScript fallback for the theme's product forms (POST /cart/add).
 * The cart lives in the browser, so this answers with a tiny page that stores the line and opens /cart —
 * the same end result as Shopify's own /cart/add redirect.
 */
export async function POST(req: Request) {
  const fd = await req.formData();
  const id = Number(fd.get('id'));
  const quantity = Math.max(1, Number(fd.get('quantity') || 1));
  const properties: Record<string, string> = {};
  fd.forEach((v, k) => { const m = k.match(/^properties\[(.+)\]$/); if (m && typeof v === 'string' && v) properties[m[1]] = v; });
  const lang = new URL(req.url).pathname.startsWith('/es/') ? '/es' : '';
  const line = JSON.stringify({ id, quantity, properties: Object.keys(properties).length ? properties : undefined });
  const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>
try{var K='ds_cart_v1',s=JSON.parse(localStorage.getItem(K)||'null')||{lines:[],note:'',attributes:{},token:Math.random().toString(36).slice(2)};
var l=${line};if(l.id){var e=s.lines.find(function(x){return x.id===l.id&&JSON.stringify(x.properties||null)===JSON.stringify(l.properties||null)});e?e.quantity+=l.quantity:s.lines.push(l);}
localStorage.setItem(K,JSON.stringify(s));}catch(err){}
location.replace('${lang}/cart');</script><noscript><a href="${lang}/cart">Continue to cart</a></noscript>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

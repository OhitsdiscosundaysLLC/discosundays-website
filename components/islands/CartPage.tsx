'use client';
import { useEffect, useState } from 'react';
import { changeLine, checkoutUrl, money, toShopifyJson, updateCart } from '@/lib/cart';

type Cart = ReturnType<typeof toShopifyJson>;
const T = {
  en: { title: 'Your cart', cont: 'Continue shopping', empty: 'Your cart is empty', product: 'Product', qty: 'Quantity', total: 'Total', subtotal: 'Subtotal', taxes: 'Taxes, discounts and shipping calculated at checkout', checkout: 'Check out', remove: 'Remove', note: 'Order special instructions' },
  es: { title: 'Tu carrito', cont: 'Seguir comprando', empty: 'Tu carrito esta vacío', product: 'Producto', qty: 'Cantidad', total: 'Total', subtotal: 'Subtotal', taxes: 'Impuestos, descuentos y envío calculados en la pantalla de pago', checkout: 'Pagar pedido', remove: 'Eliminar', note: 'Instrucciones especiales del pedido' },
};

/** Native cart page that reproduces the theme's main-cart-items / main-cart-footer markup. */
export default function CartPage({ lang, originals = [] }: { lang: string; originals?: Element[] }) {
  const t = T[lang === 'es' ? 'es' : 'en'];
  const [cart, setCart] = useState<Cart | null>(null);
  useEffect(() => {
    setCart(toShopifyJson());
    const on = (e: Event) => setCart((e as CustomEvent).detail);
    window.addEventListener('ds:cart', on);
    return () => window.removeEventListener('ds:cart', on);
  }, []);
  const empty = !cart || cart.items.length === 0;
  // An empty cart shows the theme's own server-rendered empty state (identical to Shopify);
  // a cart with items is rendered here with the same markup.
  useEffect(() => { originals.forEach((o) => o.toggleAttribute('hidden', !empty)); }, [empty, originals]);
  if (!cart || empty) return null;
  const prefix = lang === 'es' ? '/es' : '';
  return (
    <>
      <cart-items class={`page-width${empty ? ' is-empty' : ' section-cart-padding'}`} style={empty ? undefined : { display: 'block', paddingTop: 72, paddingBottom: 36 }}>
        <div className="title-wrapper-with-link">
          <h1 className="title title--primary">{t.title}</h1>
          <a href={`${prefix}/collections/all`} className="underlined-link">{t.cont}</a>
        </div>
        <div className="cart__warnings">
          <h1 className="cart__empty-text">{t.empty}</h1>
          <a href={`${prefix}/collections/all`} className="button">{t.cont}</a>
        </div>
        {!empty && (
          <form className="cart__contents" onSubmit={(e) => e.preventDefault()} id="cart">
            <div className="cart__items" id="main-cart-items">
              <div className="js-contents">
                <table className="cart-items">
                  <caption className="visually-hidden">{t.title}</caption>
                  <thead>
                    <tr>
                      <th className="caption-with-letter-spacing" colSpan={2} scope="col">{t.product}</th>
                      <th className="medium-hide large-up-hide right caption-with-letter-spacing" colSpan={1} scope="col">{t.total}</th>
                      <th className="cart-items__heading--wide small-hide caption-with-letter-spacing" colSpan={1} scope="col">{t.qty}</th>
                      <th className="small-hide right caption-with-letter-spacing" colSpan={1} scope="col">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.items.map((item, i) => (
                      <tr className="cart-item" id={`CartItem-${i + 1}`} key={item.key}>
                        <td className="cart-item__media">
                          {item.image && (
                            <>
                              <a href={prefix + item.url} className="cart-item__link" aria-hidden="true" tabIndex={-1}> </a>
                              <div className="cart-item__image-container gradient global-media-settings">
                                <img src={item.image} className="cart-item__image" alt={item.product_title} loading="lazy" width={150} />
                              </div>
                            </>
                          )}
                        </td>
                        <td className="cart-item__details">
                          <a href={prefix + item.url} className="cart-item__name h4 break">{item.product_title}</a>
                          <div className="product-option">{money(item.original_price)}</div>
                          {(!item.product_has_only_default_variant || Object.keys(item.properties).length > 0) && (
                            <dl>
                              {!item.product_has_only_default_variant && item.options_with_values.map((o) => (
                                <div className="product-option" key={o.name}><dt>{o.name}: </dt><dd>{o.value}</dd></div>
                              ))}
                              {Object.entries(item.properties).filter(([k, v]) => v && !k.startsWith('_')).map(([k, v]) => (
                                <div className="product-option" key={k}><dt>{k}: </dt><dd>{v}</dd></div>
                              ))}
                            </dl>
                          )}
                        </td>
                        <td className="cart-item__totals right medium-hide large-up-hide">
                          <div className="cart-item__price-wrapper"><span className="price price--end">{money(item.final_line_price)}</span></div>
                        </td>
                        <td className="cart-item__quantity">
                          <div className="cart-item__quantity-wrapper">
                            <label className="visually-hidden" htmlFor={`Quantity-${i + 1}`}>{t.qty}</label>
                            <div className="quantity cart-quantity">
                              <button className="quantity__button" name="minus" type="button" onClick={() => setCart(changeLine({ line: i + 1 }, item.quantity - 1))}>
                                <span className="visually-hidden">-</span>
                                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" className="icon icon-minus" fill="none" viewBox="0 0 10 2"><path fillRule="evenodd" clipRule="evenodd" d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 110 1H1A.5.5 0 01.5 1z" fill="currentColor" /></svg>
                              </button>
                              <input className="quantity__input" type="number" name="updates[]" value={item.quantity} min={0} id={`Quantity-${i + 1}`}
                                onChange={(e) => setCart(changeLine({ line: i + 1 }, Math.max(0, Number(e.target.value))))} />
                              <button className="quantity__button" name="plus" type="button" onClick={() => setCart(changeLine({ line: i + 1 }, item.quantity + 1))}>
                                <span className="visually-hidden">+</span>
                                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" className="icon icon-plus" fill="none" viewBox="0 0 10 10"><path fillRule="evenodd" clipRule="evenodd" d="M1 4.51a.5.5 0 000 1h3.5l.01 3.5a.5.5 0 001-.01V5.5l3.5-.01a.5.5 0 00-.01-1H5.5L5.49.99a.5.5 0 00-1 .01v3.5l-3.5.01H1z" fill="currentColor" /></svg>
                              </button>
                            </div>
                            <div className="cart-remove-button">
                              <a href="#" className="button button--tertiary" aria-label={t.remove} onClick={(e) => { e.preventDefault(); setCart(changeLine({ line: i + 1 }, 0)); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="icon icon-remove"><path d="M14 3h-3.53a3.07 3.07 0 00-.6-1.65C9.44.82 8.8.5 8 .5s-1.44.32-1.87.85A3.06 3.06 0 005.53 3H2a.5.5 0 000 1h1.25v10c0 .28.22.5.5.5h8.5a.5.5 0 00.5-.5V4H14a.5.5 0 000-1zM6.91 1.98c.23-.29.58-.48 1.09-.48s.85.19 1.09.48c.2.24.3.6.36 1.02h-2.9c.05-.42.17-.78.36-1.02zm4.84 11.52h-7.5V4h7.5v9.5z" fill="currentColor" /><path d="M6.55 5.25a.5.5 0 00-.5.5v6a.5.5 0 001 0v-6a.5.5 0 00-.5-.5zM9.45 5.25a.5.5 0 00-.5.5v6a.5.5 0 001 0v-6a.5.5 0 00-.5-.5z" fill="currentColor" /></svg>
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="cart-item__totals right small-hide">
                          <div className="cart-item__price-wrapper"><span className="price price--end">{money(item.final_line_price)}</span></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        )}
      </cart-items>
      {!empty && (
        <div className="page-width" id="main-cart-footer-ds" style={{ paddingBottom: 36 }}>
          <div className="cart__footer">
            <div className="cart__blocks">
              <div className="js-contents">
                <div className="totals">
                  <h2 className="totals__subtotal">{t.subtotal}</h2>
                  <p className="totals__subtotal-value">{money(cart.total_price)} USD</p>
                </div>
                <small className="tax-note caption-large rte">{t.taxes}</small>
              </div>
              <div className="cart__ctas">
                <cart-note class="cart__note field" style={{ display: 'block' }}>
                  <label htmlFor="Cart-note">{t.note}</label>
                  <textarea className="text-area field__input" name="note" id="Cart-note" defaultValue={cart.note} onBlur={(e) => setCart(updateCart(undefined, e.target.value))} />
                </cart-note>
                <button type="button" id="checkout" className="cart__checkout-button button" name="checkout" onClick={() => { location.href = checkoutUrl(); }}>
                  {t.checkout}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

# Integrations

| Feature on discosundays.com | Provider | How it works in the rebuild | Status / action needed |
|---|---|---|---|
| Product catalogue, prices, variants | Shopify | Snapshot of the public `products.json` feed in `content/products.json`; product pages are the theme's own HTML | Refresh with the sync workflow when products change |
| Cart | Shopify AJAX cart | Native client cart (`lib/cart.ts`) that answers the theme's `/cart/add`, `/cart.js`, `/cart/change` requests; native cart page | Works |
| Checkout and payments | Shopify Checkout (Shop Pay, Shop Pay Installments, PayPal…) | Cart permalink to `NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN`; Shopify checkout is unchanged | Works. Cart note and booking details travel as cart attributes |
| Customer accounts | Shopify | `/account/*` redirects to the Shopify domain | Works |
| Variant switching on product pages | Shopify section rendering | Answered client-side from product data | Works |
| Related products ("You may also like") | Shopify recommendations API | Snapshot served from `/recommendations/products` | Works |
| Search | Shopify search | Native client search over products, posts and pages (`content/search-index.json`) | Works |
| Multi-currency (Shopify Markets) | Shopify | Prices show in USD (the store currency); local currency is applied at Shopify checkout | Visitors no longer see converted prices before checkout |
| Spanish site `/es` | Shopify Translate & Adapt | All Spanish pages kept as their own routes with hreflang | Works |
| Contact form | Shopify native `/contact` | `/api/contact` → email via Resend | **Needs** `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` |
| Contact page form (form 14563) | PifyApp hosted form | Unchanged iframe embed (the hosted form works on any domain); submissions keep going to PifyApp as today | Works |
| Google reviews carousel | Reputon (Shopify-only) | Native carousel using Reputon's rendered markup and CSS, with all 23 reviews and the avatars stored locally | Works. Reviews are a snapshot: refresh with the sync workflow |
| Product reviews and star badges | Judge.me (Shopify app) | The live widgets and badges captured and rendered natively with Judge.me's own v3 stylesheets; the widget's width-based size classes (`--small` < 450 px, `--medium` < 680 px, measured on the live store) are applied by `components/islands/judgeme.ts`; "Write a review" form sends via `/api/contact` | New reviews arrive by email; add them in Judge.me to publish them |
| Shop Pay Installments banner ("Zero interest 4 payments…") | Shopify | `<shopify-payment-terms>` kept from the product HTML and rendered by Shopify's public payment-terms web component; variant changes update it | Works (checkout stays on Shopify, so the offer is accurate) |
| "Estimated delivery to 🇺🇸 United States Dec 1–5" (hoodie) | Printful | Native rebuild of Printful's storefront script (`components/islands/printfulEdt.ts`): same element, styles, flags (local), 4-hour cache; the delivery window comes from Printful's public estimate endpoint, which knows fulfilment times and the visitor's country | Works |
| Booking calendar on products | Cowlendar (Shopify-only) | Loader removed. On the live site its "Book now" button is hidden on these products (0×0), so nothing visible is lost; "Add to cart" and the Square booking buttons remain | Cowlendar date selection would need the Shopify Storefront API (token) to carry line-item properties. Square booking links are unchanged |
| Booking links | Square Appointments / Square checkout links | Unchanged links | Works |
| Team gallery, YouTube feed, EPK form, remote-mixing form | Elfsight | Unchanged embeds (Elfsight works on any domain) | One widget (`56e46520…`) reports `WIDGET_DISABLED` in Elfsight; it does the same on the live site |
| Email marketing | Klaviyo | Unchanged onsite script | Works |
| Chat bubble | Chatbase | Unchanged embed | Add the new domain to the bot's allowed domains in Chatbase, if a domain allow-list is set |
| Analytics | Metricool | Unchanged script | Works. Shopify analytics and web pixels are not loaded (they only work on Shopify) |
| Maps | Google Maps JS API (existing key) | Unchanged | Add the Vercel preview and final domain to the key's HTTP-referrer restrictions if the map must show on previews |
| Mailchimp, Instafeed scripts | — | Not loaded | They loaded on the live site, but nothing visible used them |

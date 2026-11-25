# Feature inventory and completion matrix

Status key: **Verified** = implemented and passed an automated test or a measured comparison with the live site ·
**Implemented** = built, needs a manual check · **Blocked** = needs credentials or access · **Kept external** = a
provider that must stay external (payments, bookings, hosted forms, SaaS widgets that work on any domain).

| Area | Feature | How it is built | Status |
|---|---|---|---|
| Pages | 51 English URLs and their 50 Spanish equivalents (101 URLs, incl. blog page 2), plus the 404 page | Theme HTML per URL, statically prerendered | Verified (all 200, 404 correct) |
| Pages | Header, mega menu, mobile drawer, footer, language switcher | Theme markup + theme JS | Verified visually (all pages) |
| Pages | Animations, parallax, sliders, fancybox, hover effects | Theme JS/CSS served locally | Verified visually |
| SEO | Titles, descriptions, canonicals, hreflang, Open Graph, Twitter, JSON-LD | `lib/metadata.ts`, `components/ShopifyPage.tsx` | Verified |
| SEO | `sitemap.xml`, `robots.txt` (closed until launch) | `app/sitemap.ts`, `app/robots.ts` | Verified |
| SEO | Redirects (`/pages/record-label`, collection-scoped products, `/en`, `/account/*`) | `next.config.ts` | Verified (record-label) |
| Media | 1,295 manifest entries: 193 original images and files, 6 videos, audio, 1,095 resized variants, plus theme fonts and icons, all stored locally | `public/shop`, `public/theme`, `public/vendor` | Verified (no broken images) |
| Commerce | Product pages, variant selectors, prices, sold-out state, `?variant=` URLs | `components/islands/productForms.ts` | Verified |
| Commerce | Add to cart, cart page, quantity, remove, note, `/cart.js` API | `lib/cart.ts`, `components/islands/CartPage.tsx`, fetch shim | Verified |
| Commerce | Checkout, payments, orders, customer accounts | Shopify (cart permalink, `/account` redirect) | Kept external, verified handoff |
| Commerce | Shop Pay Installments banner | Shopify's public `<shopify-payment-terms>` component | Verified (same text and size as live) |
| Commerce | Related products | Snapshot served at `/recommendations/products` | Verified |
| Commerce | Printful "Estimated delivery" line (hoodie) | Native island + Printful's public estimate endpoint | Verified (renders as live) |
| Reviews | Google reviews carousel (Reputon) | Native carousel, 23 reviews and avatars stored locally | Verified |
| Reviews | Judge.me widgets and star badges | Captured markup + Judge.me v3 CSS, native size classes | Verified |
| Reviews | Judge.me "Write a review" | Native form → `/api/contact` email | Implemented. Delivery needs Resend keys (Blocked) |
| Search | Product, article and page search, EN + ES | Native client search over `content/search-index.json` | Verified |
| Forms | Shopify contact forms (contact page, footer) | Native → `/api/contact` → Resend | Implemented. Delivery needs Resend keys (Blocked) |
| Forms | Contact page form 14563 | PifyApp hosted iframe | Kept external, verified loads |
| Forms | EPK form, remote-mixing upload form | Elfsight hosted widgets | Kept external |
| Booking | Square appointment and checkout links | Original links | Kept external |
| Booking | Cowlendar date picker | Not loaded. Its button is hidden on the live products too | Blocked for line-item properties (needs Storefront API token) |
| Widgets | Team gallery, YouTube feed (Elfsight), Klaviyo, Chatbase, Metricool, Google Maps | Original embeds | Kept external |
| Language | Spanish site under `/es` with hreflang | Separate prerendered routes | Verified |
| Ops | Content and media re-sync from the live store | `.github/workflows/sync-content.yml` | Implemented |

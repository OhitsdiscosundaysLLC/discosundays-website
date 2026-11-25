# Migration audit (summary)

Source: https://discosundays.com, a Shopify store on a customised Dawn-based theme ("Copy of music theme",
theme id 137301393617), English with a Spanish translation under `/es` (Shopify Translate & Adapt).

## What was inventoried

- **URLs:** every page reachable from the menus, footer, sitemap and product/blog links, plus unlinked pages
  (`/pages/remote-mixing`, `/pages/refunds-and-cancellation-policy`, `/agents.md`) and the Spanish equivalents.
  Full list: [PAGE_INVENTORY.md](PAGE_INVENTORY.md).
- **Media:** every image, GIF, video, audio file, font and icon referenced in HTML, CSS, `srcset`, lazy-load
  attributes, inline scripts and theme assets, including the exact resized variants the theme requests.
  Full list: [ASSET_INVENTORY.md](ASSET_INVENTORY.md) and `asset-manifest.json`.
- **Apps and scripts:** each one identified, with what it shows, where, and how it is handled:
  [INTEGRATIONS.md](INTEGRATIONS.md). App-generated interfaces that only work on Shopify were rebuilt natively
  (cart, variant switching, search, Reputon Google reviews, Judge.me reviews, Printful delivery estimate,
  related products, forms). Providers that must stay external stay external (Shopify checkout and accounts,
  Square bookings, PifyApp and Elfsight hosted forms and widgets, Klaviyo, Chatbase, Metricool, Google Maps).
- **Feature status:** [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md). **Blockers:** [MIGRATION_BLOCKERS.md](MIGRATION_BLOCKERS.md).

## Approach

The site is not redesigned. Each URL is rendered from the theme's own server HTML (with every asset rewritten to
local copies), so text, layout, fonts, animations, hover states and responsive behaviour are the theme's own.
Only the parts that depended on Shopify's servers or Shopify-only apps were replaced, with native code
that produces the same markup and behaviour. Payments, orders and customer data stay in Shopify.

# Disco Sundays — public website

1:1 migration of **discosundays.com** from Shopify to **Next.js (App Router) + TypeScript + Tailwind**, hosted on **Vercel**.
This repository is independent of the Disco Sundays CRM. Nothing here reads from or writes to the CRM.

## How the rebuild works

| Layer | What it is | Where |
|---|---|---|
| Pages | Every URL of the live store, rendered from the theme's own HTML so layout, text, fonts, animations, hover effects, menus and responsive behaviour are identical | `content/pages/**.json` → `app/(en)`, `app/(es)/es` |
| Styling and behaviour | The original theme CSS and JS (served locally) plus Tailwind utilities for new components (no preflight, so the theme CSS stays authoritative) | `public/theme/`, `app/islands.css` |
| Media | Every image, video, audio file and icon the site uses, downloaded at original quality plus the exact resized variants the theme requests | `public/shop/`, `public/vendor/`, `asset-manifest.json` |
| Shopify-only features rebuilt natively | Cart and checkout handoff, search, the contact and other forms, the Google-reviews carousel (Reputon), Judge.me reviews, related products, variant switching | `components/islands/`, `lib/cart.ts`, `app/api/`, `app/recommendations/` |
| Third-party SaaS kept as is (work on any domain) | Elfsight widgets, Klaviyo, Chatbase, Metricool, Square booking links, Google Maps | embedded in the page HTML |

Orders, payments and customer records **stay in Shopify**. The cart is kept in the browser and checkout is handed to Shopify with a
[cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink), so no payment system or customer data is migrated.

## Commands

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # production build (runs scripts/fetch-data.mjs first)
npm run typecheck
```

Content and asset refresh from the live store (only while discosundays.com still points at Shopify):

```bash
node scripts/crawl.mjs                  # writes raw/ + crawl.json (run in a scratch dir)
node scripts/capture-widgets.mjs .      # Reputon + Judge.me widget snapshots (needs Playwright)
node scripts/transform.mjs <scratch> .  # content/ + any newly referenced assets
```

The `Sync content from Shopify` GitHub Action runs those steps and commits the result.

## Documentation

- [MIGRATION_PROGRESS.md](MIGRATION_PROGRESS.md) — milestones, current state and the exact next action
- [docs/MIGRATION_AUDIT.md](docs/MIGRATION_AUDIT.md) — audit summary and approach
- [docs/PAGE_INVENTORY.md](docs/PAGE_INVENTORY.md) — URL inventory, route mapping and redirects
- [docs/ASSET_INVENTORY.md](docs/ASSET_INVENTORY.md) — asset inventory (full list in `asset-manifest.json`)
- [docs/FEATURE_INVENTORY.md](docs/FEATURE_INVENTORY.md) — every feature with its completion status
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — every app and integration and how it is handled
- [docs/MIGRATION_BLOCKERS.md](docs/MIGRATION_BLOCKERS.md) — what needs credentials or approval, and known differences
- [docs/TEST-REPORT.md](docs/TEST-REPORT.md) — functional and visual comparison results
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — environment variables
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/DEPLOYMENT_STATUS.md](docs/DEPLOYMENT_STATUS.md) — Vercel deployment
- [docs/DOMAIN-MIGRATION.md](docs/DOMAIN-MIGRATION.md) — go-live steps (only after explicit approval)

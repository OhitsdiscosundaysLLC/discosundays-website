# Test report

Tested on 2026-11-25 against a production build (`next build` + `next start`) of this repository's code and data,
compared with the live store at https://discosundays.com. Scripts: `scripts/functional-test.mjs`,
`scripts/visual-compare.mjs`, `scripts/section-compare.mjs` (Playwright + Chromium).

## Functional tests: 27 / 27 passed

| # | Check | Result |
|---|---|---|
| 1 | All 101 English and Spanish URLs return 200 | pass |
| 2 | Unknown URL returns the theme's 404 page with status 404 | pass |
| 3 | `/pages/record-label` permanently redirects to `/pages/team` | pass |
| 4 | `sitemap.xml` lists the pages | pass |
| 5 | `robots.txt` blocks crawling until indexing is enabled | pass |
| 6 | Title, description, canonical, `og:image` and hreflang present on pages | pass |
| 7–11 | No broken images on `/`, `/pages/services`, `/pages/gallery`, `/products/recording-session`, `/blogs/news` | pass |
| 12 | Preserved background video is served | pass |
| 13 | Choosing "2 Hours" on Recording Session changes the price to $120.00 | pass |
| 14 | Judge.me reviews visible on the product page | pass |
| 15 | Related products ("You may also like") load | pass |
| 16 | "Add to cart" opens `/cart` | pass |
| 17 | Cart shows the added item and its price | pass |
| 18 | `/cart.js` reflects the cart in Shopify's format | pass |
| 19 | Checkout hands off to a Shopify cart permalink with the right variant and quantity | pass |
| 20 | Removing the item shows the theme's own empty-cart state | pass |
| 21 | Search returns results | pass |
| 22 | Contact page PifyApp form iframe loads at full height | pass |
| 23 | Contact API answers honestly (503 until Resend is configured, 200 after) | pass |
| 24 | Shopify-style contact form shows a status message | pass |
| 25 | Google reviews carousel rendered (23 reviews + summary card) | pass |
| 26 | Reviews carousel "next" button moves it | pass |
| 27 | Mobile home renders with the same width quirk as live (scroll width ≈ 416 px) | pass |

## Visual comparison (full page, pixel difference vs. live)

Lower is better. 0–2 % is anti-aliasing, video frames and carousel timing. Widths: desktop 1440, tablet 768, mobile 390.

| Page | Desktop | Tablet | Mobile | Notes |
|---|---|---|---|---|
| `/` | 0.94 % | 1.31 % | 2.40 % | |
| `/pages/services` | 0.66 % | 1.60 % | 1.42 % | |
| `/pages/gallery` | 0.89 % | 4.26 % | 4.51 % | Elfsight gallery loads at a different moment |
| `/pages/shop` | 4.32 % | 3.95 % | 4.96 % | Page is 20 px shorter; see blockers |
| `/pages/projects` | 0.38 % | 2.55 % | 3.47 % | YouTube feed thumbnails (live feed) |
| `/blogs/news` | 0.44 % | 2.26 % | 2.39 % | |
| `/pages/team` | 31.4 % | 33.1 % | 23.3 % | The live site shuffles the team order on every load, so no two loads match. The members and layout are the same. |
| `/pages/artist-press-kit-epk` | 0.32 % | 1.85 % | 2.07 % | |
| `/pages/about` | 0.41 % | 2.21 % | 2.51 % | |
| `/pages/contact` | 0.37 % | 2.14 % | 2.41 % | |
| `/pages/remote-mixing` | 1.22 % | 2.21 % | 3.08 % | |
| `/pages/refunds-and-cancellation-policy` | 0.37 % | 1.59 % | 2.04 % | |
| `/policies/privacy-policy` | 0.45 % | 1.31 % | 1.16 % | |
| `/collections/all` | 0.78 % | 1.19 % | 1.82 % | |
| `/products/recording-session` | 0.79 % | 3.73 % | 1.80 % | Was 15–27 % before the Judge.me CSS, size-class and Shop Pay banner fixes |
| `/products/unisex-disco-sundays-hoodie` | 1.09 % | 2.03 % | 2.32 % | Was 9–12 % on tablet/mobile before the Printful delivery line was rebuilt |
| `/blogs/news/full-interview-w-ceo-melvin-thomas` | 0.98 % | 2.46 % | 1.90 % | |
| `/cart` | 0.62 % | 3.43 % | 4.17 % | Was 26 % before the empty-cart state fix |
| `/search` | 0.93 % | 4.20 % | 5.30 % | |
| `/es` | 0.95 % | 1.33 % | 2.40 % | |

Most mobile pages are 4 px shorter than live, which shifts everything below that point by 4 px and accounts for most
of the 1–3 % mobile difference. The cause has not been pinned down yet (it is in the shared footer area; see
MIGRATION_BLOCKERS.md).

## Bugs reproduced on purpose (they exist on the live site too)

- Console: `ReferenceError: SearchForm is not defined` (theme script order).
- `/img/paralax-3.png` and `/img/paralax-4.png` return 404 (referenced by the theme, missing on the live site).
- Elfsight widget `56e46520…` reports `WIDGET_DISABLED`.

## How to re-run

```bash
npm run build && npm start &
npx playwright install chromium
node scripts/functional-test.mjs http://localhost:3000
node scripts/visual-compare.mjs http://localhost:3000 vt-out
node scripts/section-compare.mjs http://localhost:3000 /products/recording-session 768
```

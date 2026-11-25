# Migration blockers and known differences

## Needs something from the owner

| # | Item | Why it is blocked | What unblocks it |
|---|---|---|---|
| 1 | Form delivery (contact, footer, Judge.me "Write a review") | Sending email needs a provider account. No credentials were invented. | Create a Resend account, verify the sending domain and set `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` in Vercel (docs/ENVIRONMENT.md). Until then the forms show an honest error. |
| 2 | Cowlendar booking date picker | Cowlendar only runs inside Shopify. Its "Book now" button is hidden on the live products today, so nothing visible is missing. Passing a chosen date into checkout needs line-item properties, which a cart permalink cannot carry. | A Shopify Storefront API token, if date selection on the site is wanted. Square booking links already work. |
| 3 | Going live on discosundays.com | Needs your explicit approval and DNS changes | Follow docs/DOMAIN-MIGRATION.md after you approve |
| 4 | Google Maps on preview URLs | The existing API key may be restricted to discosundays.com | Add the Vercel URLs to the key's HTTP-referrer list (optional) |
| 5 | Chatbase bubble on preview URLs | Bot may have a domain allow-list | Add the Vercel URL in Chatbase (optional) |

## Known small visual differences (measured, not blocking)

| Page | Difference | Cause |
|---|---|---|
| `/pages/team` | 23–33 % pixel difference | The live site shuffles the team order on every load. Same members, same layout. |
| `/pages/shop` | Rebuild is 20 px shorter (≈4 % difference) | Not yet identified |
| Most pages on mobile | Rebuild is 4 px shorter in the footer reviews area | Not yet identified |
| `/products/recording-session` on tablet | Rebuild is 24 px shorter (3.7 %) | Not yet identified |

## Snapshot data (refresh when the store changes)

Products, prices, related products, Google reviews and Judge.me reviews are snapshots taken on 2026-11-25. Run the
**Sync content from Shopify** workflow while discosundays.com still serves the Shopify store to refresh them.
After the domain moves, product edits made in Shopify will not appear on the site until the snapshot is refreshed.
The sync scripts currently read from `https://discosundays.com`; before launch they need pointing at the Shopify domain
that stays on Shopify (see DOMAIN-MIGRATION.md).

## Not migrated on purpose

- Shopify analytics, web pixels, Shop app sign-in, accelerated checkout buttons: they only work on a Shopify-hosted storefront.
- Mailchimp and Instafeed scripts: loaded on the live site but nothing visible uses them.
- 4K video masters (365 MB and 369 MB): not used by any page; the renditions the site plays are included.

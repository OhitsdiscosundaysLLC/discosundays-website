# Environment variables

Set these in Vercel → Project `disco-sundays-website` → Settings → Environment Variables. See also `.env.example`.

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | all | Public origin used for canonical tags, hreflang, Open Graph and the sitemap. Keep `https://discosundays.com` for both preview and production so previews never present themselves as canonical. |
| `NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN` | yes | all | Shopify domain that receives cart permalinks and serves checkout and customer accounts. Before launch: `disco-sundays.myshopify.com`. After launch: the checkout subdomain, e.g. `shop.discosundays.com` (see DOMAIN-MIGRATION.md). |
| `RESEND_API_KEY` | for forms | production (+ preview if you want to test) | API key from resend.com used by `/api/contact` to deliver contact, EPK, remote-mixing and review form submissions. |
| `CONTACT_TO_EMAIL` | for forms | same | Inbox(es) that receive submissions, comma-separated. |
| `CONTACT_FROM_EMAIL` | for forms | same | Verified sender, e.g. `Disco Sundays <website@discosundays.com>` (domain must be verified in Resend). |
| `ALLOW_INDEXING` | at go-live | production | Set to `1` only when discosundays.com points at Vercel. Until then robots.txt disallows all crawling, so `*.vercel.app` URLs are never indexed. |
| `DATA_BUNDLE_URL` | only for repo-less deployments | build | URL of a `.tgz` with `content/` and `public/{shop,theme,vendor}`. Not needed once the data is committed to the repository. |

Until the three form variables are set, form submissions return a visible error. The site never shows a success message for a message it did not deliver.

No Shopify Admin or Storefront tokens are needed: product data is a snapshot taken from the public products feed, and checkout uses cart permalinks.

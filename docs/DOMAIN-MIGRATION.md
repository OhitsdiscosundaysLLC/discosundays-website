# Domain migration — do not start without explicit approval

The live Shopify site keeps running unchanged until every step below is approved. Shopify stays the commerce backend:
products, orders, payments, customers, Judge.me, Square links and checkout all remain there.

## Before the switch
1. Sign off the preview and docs/TEST-REPORT.md.
2. Configure form delivery (ENVIRONMENT.md) and send one test of each form.
3. Re-run **Sync content from Shopify** on the same day, so prices, products, blog posts and reviews are current.
4. Lower the TTL of the `discosundays.com` and `www` DNS records to 300 seconds, 24 hours ahead.

## Checkout subdomain (keeps Shopify checkout working)
5. Shopify Admin → Settings → Domains → **Connect existing domain** → `shop.discosundays.com`.
6. At the DNS provider: `shop` CNAME → `shops.myshopify.com`. Wait for Shopify to show it as connected and the SSL certificate as issued.
7. Make `shop.discosundays.com` the **primary domain** in Shopify, so checkout and customer-account links use it.
8. In Vercel set `NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN=shop.discosundays.com` and redeploy.

## Point the main domain at Vercel
9. Vercel → Project → Settings → Domains → add `discosundays.com` and `www.discosundays.com` (redirect `www` → apex, as today).
10. At the DNS provider: apex `A` → `76.76.21.21`; `www` CNAME → `cname.vercel-dns.com` (use the exact values Vercel displays).
11. Remove `discosundays.com` and `www` from Shopify Domains only **after** Vercel shows them as valid. Shopify keeps the `shop.` subdomain.
12. In Vercel set `ALLOW_INDEXING=1` (production) and redeploy, so robots.txt allows crawling.
13. Verify: the home page, a product, add to cart → checkout on `shop.discosundays.com`, the contact form, `/sitemap.xml`, `/robots.txt`, `/es`, `/pages/record-label` → 301.
14. Google Search Console: submit `https://discosundays.com/sitemap.xml`.

## Rollback
Put the DNS records back to the Shopify values (`A` → `23.227.38.65`, `www` CNAME → `shops.myshopify.com`) and reconnect the domain in Shopify. With a TTL of 300 the switch back takes minutes.

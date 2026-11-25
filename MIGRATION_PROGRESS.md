# Migration progress

Resumable log for the discosundays.com → Next.js/Vercel migration. Update after every milestone.

_Last updated: 2026-11-25_

## Current state

- Phases done: audit → asset capture → rebuild → native replacements for Shopify-only features → SEO → testing.
- Last tested build: **27/27 functional checks pass**; visual comparison results are in [docs/TEST-REPORT.md](docs/TEST-REPORT.md).
- Repository: `OhitsdiscosundaysLLC/discosundays-website`, linked to Vercel project `disco-sundays-website`.
- Live site: untouched. discosundays.com still serves Shopify. No domain is attached to the Vercel project.

## Milestones

| # | Milestone | State |
|---|---|---|
| 1 | Audit and URL/feature inventory | Done |
| 2 | Download all original media and the theme's resized variants | Done (1,295 manifest entries) |
| 3 | Rebuild all 101 EN/ES URLs from the theme's HTML | Done |
| 4 | Native cart, variant switching, checkout handoff, search, forms | Done, tested |
| 5 | Native Reputon Google reviews carousel and Judge.me reviews | Done, tested |
| 6 | PifyApp form height, policy page styles, empty-cart state | Done, tested |
| 7 | Judge.me v3 stylesheets and width-based size classes | Done, tested (2026-11-25) |
| 8 | Shop Pay Installments banner via Shopify's public component | Done, tested (2026-11-25) |
| 9 | Printful "Estimated delivery" line rebuilt natively | Done, tested (2026-11-25) |
| 10 | Docs: inventories, blockers, test report, deployment and domain guides | Done |
| 11 | Push code to GitHub | Done (2026-11-25) |
| 12 | Import site data (content + media) into the repo | Done: commit `9a6f75d`, bundle SHA-256 verified |
| 13 | Vercel deployment built from GitHub, tested | Done: `dpl_B3ymognsjTRLQUmWArWi3DDKh8VN`, 27/27 on the deployed URL |
| 14 | Domain switch to discosundays.com | **Waiting for your explicit approval** (docs/DOMAIN-MIGRATION.md) |

## Exact next action

1. Owner: add the Resend variables (docs/ENVIRONMENT.md) so form submissions are delivered.
2. Owner: review the deployment at https://disco-sundays-website.vercel.app (log in to Vercel).
3. When you approve going live, follow docs/DOMAIN-MIGRATION.md. Nothing has been changed on discosundays.com.

## How to resume work

- Code and data are all in this repository; `npm install && npm run build && npm start` reproduces the tested site.
- Tests: `node scripts/functional-test.mjs <url>`, `node scripts/visual-compare.mjs <url> out/`.
- Re-capture from the live store: **Sync content from Shopify** workflow (only while the domain is still on Shopify).

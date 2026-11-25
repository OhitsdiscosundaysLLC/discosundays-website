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
| 11 | Push code to GitHub | See git log |
| 12 | Import site data (content + media) into the repo | Import workflow `.github/workflows/import-site-data.yml` |
| 13 | Vercel preview of the final code and data | Done: `dpl_5pV4RdV2M15XPjNk6pU5gRKW2cmH`, 27/27 on the deployed URL. Git-triggered deployments start after the data import |
| 14 | Domain switch to discosundays.com | **Waiting for your explicit approval** (docs/DOMAIN-MIGRATION.md) |

## Exact next action

1. Confirm the **Import site data bundle** workflow committed `content/` and `public/` (Actions tab).
2. Confirm the Vercel deployment of that commit is Ready, then run `scripts/functional-test.mjs` against it.
3. Add the Resend environment variables to enable form delivery.
4. When approved, follow docs/DOMAIN-MIGRATION.md.

## How to resume work

- Code and data are all in this repository; `npm install && npm run build && npm start` reproduces the tested site.
- Tests: `node scripts/functional-test.mjs <url>`, `node scripts/visual-compare.mjs <url> out/`.
- Re-capture from the live store: **Sync content from Shopify** workflow (only while the domain is still on Shopify).

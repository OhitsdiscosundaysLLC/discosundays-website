# Deployment status

_Last updated: 2026-11-25_

| Item | State |
|---|---|
| GitHub repository | `OhitsdiscosundaysLLC/discosundays-website` (branch `main`) |
| Vercel project | `disco-sundays-website` (`prj_qpFigU5QMHi2yMAMj1EyQAJzkCMB`, team DIsco Sundays LLC), linked to the repository |
| Separate from the CRM | Yes. `disco-sundays-crm` and `marylandrecordingstudio` were not touched. |
| Build settings | Framework Next.js, Node 22.x, default install and build (`npm run build`), Ignored Build Step skips commits without site data |
| Custom domain | **None attached.** discosundays.com still points at Shopify and is unchanged. |
| Deployment protection | Vercel Authentication on for all deployment URLs (log in to the Vercel team to view) |
| Indexing | `robots.txt` disallows everything until `ALLOW_INDEXING=1` is set at launch |
| Environment variables still to add | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (forms). `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN` have safe defaults in code. |
| Last tested build | Preview `dpl_5pV4RdV2M15XPjNk6pU5gRKW2cmH`: 27/27 functional checks on the deployed URL; visual comparison in TEST-REPORT.md |

## History

| Date | Deployment | Notes |
|---|---|---|
| 2026-11-24 | `dpl_B6Y6mcP47ms8TtHNWnJne1iszmj3` | First preview, uploaded directly (before the repository existed) |
| 2026-11-25 | `dpl_4ghvPSYJ7sFDiGrwxRZ1Hmeo86fj`, `dpl_FksbqPYvZc9LoWMDvUx3qXfBjSz1` | Failed: temporary bundle not reachable / build script mismatch. Superseded by Git deployments. |
| 2026-11-25 | `dpl_5pV4RdV2M15XPjNk6pU5gRKW2cmH` (preview) | Uploaded build of exactly this code and data. **27/27 functional checks passed on the deployed URL.** |
| next | Git deployments from `main` | Start once the site data is imported into the repository |

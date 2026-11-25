# Deployment (Vercel)

- Team: `team_tsXNlOi370FNHfJJ6U9VcIsm`
- Project: **disco-sundays-website** (`prj_qpFigU5QMHi2yMAMj1EyQAJzkCMB`), framework Next.js. This is a separate project from `disco-sundays-crm`, which has not been touched.
- Vercel Authentication is on for preview deployments, so previews are only visible to logged-in team members.
- `robots.txt` disallows everything except on the production environment.

## GitHub repository

- Repository: **OhitsdiscosundaysLLC/discosundays-website**, connected to this Vercel project. Pushes to `main` deploy to the
  project's `*.vercel.app` URL (no custom domain is attached); other branches create previews.
- The repository holds the code **and** the site data (`content/`, `public/shop`, `public/theme`, `public/vendor`,
  `asset-manifest.json`), so builds need no external downloads.
- The data was seeded by the **Import site data bundle** workflow (`.github/site-data.json` → verified `.tgz`). The
  bundle URL in that file was a temporary build server and is no longer needed; the data now lives in the repository.
  Refresh it later with **Sync content from Shopify** (only while discosundays.com still serves the Shopify store).
- Vercel "Ignored Build Step" is set to skip builds of commits that do not contain the site data yet:
  `if [ -f content/routes.json ] && [ -d public/shop ]; then exit 1; else exit 0; fi`.
- Add the environment variables from ENVIRONMENT.md.

## Build

`npm run build` = `scripts/fetch-data.mjs` (a no-op when the data is in the repo) + `next build`.
All 105 pages are prerendered as static HTML. The only server code is `/api/contact` and `/recommendations/products`.

## Rollback

Every deployment is immutable. Use Vercel → Deployments → *Promote* or *Instant Rollback* to return to a previous build.
While the domain still points at Shopify, the live store is unaffected by anything deployed here.

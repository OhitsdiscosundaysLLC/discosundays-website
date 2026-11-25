# Asset inventory

Every file the live site uses was downloaded from the Shopify CDN at original quality. The full list, with source URL,
local path, size and content type for every file, is in [`asset-manifest.json`](../asset-manifest.json).

**Totals:** 1,295 manifest entries: 193 original images and files, 6 videos, 1 audio set and 1,095 resized variants.
On disk that is 1,468 files and about 787 MB (`public/shop` 765 MB, `content` 20 MB, `public/theme` 1.7 MB, `public/vendor` 0.5 MB).
The largest file is a 94 MB video, under GitHub's 100 MB limit, so no Git LFS is needed.

| Folder | What it holds |
|---|---|
| `public/shop/files/` | Images, GIFs, audio (`a-1.mp3`, `a-2.mp3`, `01.mp3`) and other files from Shopify *Files*, at original resolution |
| `public/shop/products/`, `public/shop/articles/` | Product and blog images, originals |
| `public/shop/**/_v/` | The exact resized variants the theme requests (e.g. `logo__300x.png`, `photo__w800.jpg`). The layout depends on these sizes, so they are kept as separate files next to the originals |
| `public/shop/videos/` | The six MP4 renditions the live site actually plays (1080p / 720p / 480p as served by Shopify). The 4K `.mov`/`.mp4` masters stay in Shopify Files |
| `public/theme/` | The theme's CSS, JavaScript, fonts, icons and loader GIFs (theme `Copy of music theme`, id 137301393617) |
| `public/vendor/` | Judge.me and Reputon assets, Google-review avatars, Shopify's policy stylesheet |

## Conversions
- 17 product photos are HEIC (iPhone) originals. Browsers can't display HEIC, so each one also has a JPEG rendition (`.jpg`, same name) made by Shopify's image CDN at full resolution. The HEIC original is kept.

## Not migrated, on purpose
- 4K video masters (365 MB and 369 MB files) — not used by any page; the 1080p renditions the site plays are included.
- `/img/paralax-3.png` and `/img/paralax-4.png` — the live theme references these, but they don't exist on the live site either (404). The reference is kept as-is so behaviour is identical.
- Third-party embeds that load from their providers at runtime (Elfsight widgets, PifyApp form, Chatbase, Klaviyo, Metricool, YouTube, Google Maps) — they're served by those services on any domain.

## Refreshing
`node scripts/transform.mjs` downloads any newly referenced asset automatically and appends it to the manifest.

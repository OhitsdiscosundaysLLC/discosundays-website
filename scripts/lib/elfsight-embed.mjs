// Replaces Elfsight placeholders (<div class="elfsight-app-ID" data-elfsight-app-lazy></div>) with the
// natively rebuilt section stored in content/widgets/elfsight/ID.json, and removes Elfsight's platform.js.
// Used by scripts/build-elfsight.mjs and scripts/transform.mjs (so a content re-sync keeps the native sections).
import fs from 'node:fs';
import path from 'node:path';

export function embedElfsight(html, dataDir) {
  // platform scripts
  html = html.replace(/<script[^>]+src="[^"]*elfsight[^"]*platform\.js[^"]*"[^>]*>\s*<\/script>/gi, '');
  return html.replace(/<div class="elfsight-app-([0-9a-f-]{36})"[^>]*>\s*<\/div>/gi, (m, id) => {
    const file = path.join(dataDir, `${id}.json`);
    // A widget with no stored data is disabled in Elfsight and shows nothing on the live site either.
    if (!fs.existsSync(file)) return '';
    const w = JSON.parse(fs.readFileSync(file, 'utf8'));
    const css = w.variants.map((v, i) => {
      const scoped = v.media ? `@media ${v.media}{${v.css}}` : v.css;
      const hide = w.variants.length > 1 && v.media ? `@media not all and ${v.media}{.ds-elf-${id}-v${i}{display:none!important}}` : '';
      return scoped + hide;
    }).join('\n');
    const body = w.variants.map((v, i) => `<div class="ds-elf-v ds-elf-${id}-v${i}">${v.html}</div>`).join('');
    const extra = w.lightbox || w.videos || w.form ? `<script type="application/json" class="ds-elfsight-data">${JSON.stringify({ kind: w.kind, lightbox: w.lightbox, videos: w.videos, form: w.form }).replace(/</g, '\\u003c')}</script>` : '';
    return `<div class="elfsight-app-${id} ds-elfsight" data-ds-elfsight="${w.kind}"><style>${css}</style>${body}${extra}</div>`;
  });
}

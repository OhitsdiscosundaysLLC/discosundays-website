// Ensures the site data (page content + preserved media) is present before `next build`.
// In the GitHub repository the data is committed (content/, public/shop, public/theme, public/vendor),
// so this script does nothing. For deployments made without the repository, DATA_BUNDLE_URL points to a
// .tgz of those folders and it is downloaded and unpacked here.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (fs.existsSync('content/routes.json') && fs.existsSync('public/shop')) {
  console.log('[fetch-data] site data present');
  process.exit(0);
}
const url = process.env.DATA_BUNDLE_URL;
if (!url) {
  console.error('[fetch-data] content/ or public/shop missing and DATA_BUNDLE_URL is not set');
  process.exit(1);
}
console.log('[fetch-data] downloading data bundle');
execSync(`curl -fsSL --retry 3 "${url}" | tar -xzf -`, { stdio: 'inherit', shell: '/bin/bash' });
console.log('[fetch-data] done:', fs.readdirSync('content').length, 'content entries');

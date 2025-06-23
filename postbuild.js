const fs = require('fs');
const path = require('path');
const { copyRecursiveSync } = require('./scripts/copyRecursive');

const folders = ['html', 'css', 'fonts', 'icons'];
const appDir = path.join(__dirname, 'app');
const distDir = path.join(__dirname, 'dist', 'app');

for (const folder of folders) {
  const src = path.join(appDir, folder);
  const dest = path.join(distDir, folder);
  copyRecursiveSync(src, dest);
}

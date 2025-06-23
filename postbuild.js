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

// Ensure Bulma CSS is available in the final package. We keep Bulma in
// node_modules to avoid committing the large CSS file. Here we copy the
// necessary files into the dist directory so that style.css can @import them.
const bulmaSrc = path.join(__dirname, 'node_modules', 'bulma', 'css');
const bulmaDest = path.join(distDir, 'css', 'bulma', 'css');
if (fs.existsSync(bulmaSrc)) {
  copyRecursiveSync(bulmaSrc, bulmaDest);
}

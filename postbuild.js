const fs = require('fs');
const path = require('path');

const folders = ['html', 'css', 'fonts', 'icons', 'ts/common/fontawesome'];
const appDir = path.join(__dirname, 'app');
const distDir = path.join(__dirname, 'dist', 'app');

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursiveSync(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const folder of folders) {
  const src = path.join(appDir, folder);
  const dest = path.join(distDir, folder);
  copyRecursiveSync(src, dest);
}

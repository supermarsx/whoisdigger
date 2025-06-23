const fs = require('fs');
const path = require('path');
const watchboy = require('watchboy');

const folders = ['html', 'css', 'fonts', 'icons'];
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
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function copyFile(src) {
  const rel = path.relative(appDir, src);
  if (rel.startsWith('..')) return; // ignore changes outside app dir
  const dest = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`[watch-assets] copied ${rel}`);
}

for (const folder of folders) {
  const src = path.join(appDir, folder);
  const dest = path.join(distDir, folder);
  copyRecursiveSync(src, dest);
}

const patterns = folders.map(f => `app/${f}/**/*`);
const watcher = watchboy(patterns, { cwd: __dirname });

watcher.on('add', ({ path: p }) => copyFile(p));
watcher.on('change', ({ path: p }) => copyFile(p));

watcher.on('ready', () => console.log('[watch-assets] watching assets...'));

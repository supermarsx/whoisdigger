const fs = require('fs');
const path = require('path');
const watchboy = require('watchboy');
const { copyRecursiveSync } = require('./scripts/copyRecursive');
const debug = require('debug')('watch-assets');

const folders = ['html', 'html/templates', 'css', 'fonts', 'icons'];
const appDir = path.join(__dirname, 'app');
const distDir = path.join(__dirname, 'dist', 'app');

function copyFile(src) {
  const rel = path.relative(appDir, src);
  if (rel.startsWith('..')) return; // ignore changes outside app dir
  const dest = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  debug(`copied ${rel}`);
}

for (const folder of folders) {
  const src = path.join(appDir, folder);
  const dest = path.join(distDir, folder);
  copyRecursiveSync(src, dest);
}

// Also copy Bulma CSS from node_modules so style.css can import it.
const bulmaSrc = path.join(__dirname, 'node_modules', 'bulma', 'css');
const bulmaDest = path.join(distDir, 'css', 'bulma', 'css');
if (fs.existsSync(bulmaSrc)) {
  copyRecursiveSync(bulmaSrc, bulmaDest);
}

const patterns = folders.map((f) => `app/${f}/**/*`);
const watcher = watchboy(patterns, { cwd: __dirname });

watcher.on('add', ({ path: p }) => copyFile(p));
watcher.on('change', ({ path: p }) => copyFile(p));

watcher.on('ready', () => debug('watching assets...'));

import fs from 'fs';
import path from 'path';
import watchboy from 'watchboy';
import { copyRecursiveSync } from './copyRecursive.js';
import { precompileTemplates } from './precompileTemplates.js';
import { debugFactory } from './logger.js';

const rootDir = process.cwd();
const debug = debugFactory('watch-assets');

const folders = [
  'html',
  'html/templates',
  'css',
  'fonts',
  'icons',
  'compiled-templates',
  'locales',
  'vendor'
];
const appDir = path.join(rootDir, 'app');
const distDir = path.join(rootDir, 'dist', 'app');

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
  if (fs.existsSync(src)) {
    copyRecursiveSync(src, dest);
  }
}

// Only precompile templates if they have not been generated yet
const compiledDir = path.join(appDir, 'compiled-templates');
if (!fs.existsSync(compiledDir)) {
  precompileTemplates();
}

// Also copy Bulma CSS from node_modules so style.css can import it.
const bulmaSrc = path.join(rootDir, 'node_modules', 'bulma', 'css');
const bulmaDest = path.join(distDir, 'css', 'bulma', 'css');
if (fs.existsSync(bulmaSrc)) {
  copyRecursiveSync(bulmaSrc, bulmaDest);
}

const patterns = folders.map((f) => `app/${f}/**/*`);
const watcher = watchboy(patterns, { cwd: rootDir });

watcher.on('add', ({ path: p }) => {
  copyFile(p);
});

watcher.on('change', ({ path: p }) => {
  copyFile(p);
});

watcher.on('ready', () => debug('watching assets...'));

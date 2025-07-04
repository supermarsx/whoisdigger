import fs from 'fs';
import path from 'path';
import { dirnameCompat } from './dirnameCompat.js';
const baseDir = dirnameCompat();

const distDirs = [
  path.join(baseDir, '..', 'dist', 'app', 'ts'),
  path.join(baseDir, '..', 'dist', 'main'),
  path.join(baseDir, '..', 'dist', 'renderer')
];

function copyOrLink(srcPath, destPath, relative) {
  if (fs.existsSync(destPath)) return;
  try {
    fs.symlinkSync(relative, destPath);
  } catch {
    fs.copyFileSync(srcPath, destPath);
  }
}

function processDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(full);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.cjs')) {
        const jsName = entry.name.replace(/\.cjs$/, '.js');
        const jsPath = path.join(dir, jsName);
        copyOrLink(full, jsPath, entry.name);
        const base = jsPath.slice(0, -3);
        copyOrLink(jsPath, base, jsName);
      } else if (entry.name.endsWith('.js')) {
        const base = full.slice(0, -3);
        copyOrLink(full, base, entry.name);
      }
    }
  }
}

for (const dir of distDirs) {
  if (fs.existsSync(dir)) {
    processDir(dir);
  }
}

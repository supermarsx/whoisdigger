import fs from 'fs';
import path from 'path';
import { dirnameCompat } from './dirnameCompat.js';
const baseDir = dirnameCompat();

const distDirs = [
  path.join(baseDir, '..', 'dist', 'app', 'ts'),
  path.join(baseDir, '..', 'dist', 'main'),
  path.join(baseDir, '..', 'dist', 'renderer')
];

function processDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const base = full.slice(0, -3);
      if (!fs.existsSync(base)) {
        fs.symlinkSync(entry.name, base); // relative link within same dir
      }
    }
  }
}

for (const dir of distDirs) {
  if (fs.existsSync(dir)) {
    processDir(dir);
  }
}

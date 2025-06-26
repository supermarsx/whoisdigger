import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.join(__dirname, '..', 'dist', 'app', 'ts');

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

processDir(distDir);

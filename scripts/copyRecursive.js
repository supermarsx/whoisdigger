import fs from 'fs';
import path from 'path';

export function copyRecursiveSync(src, dest) {
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

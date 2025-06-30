import fs from 'fs';
import path from 'path';
import { dirnameCompat } from './dirnameCompat.js';

const baseDir = dirnameCompat();
const rootDir = path.join(baseDir, '..');
const modulesDir = path.join(rootDir, 'node_modules');
const vendorDir = path.join(rootDir, 'app', 'vendor');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function writeFile(dest, content) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

copyFile(
  path.join(modulesDir, 'handlebars', 'dist', 'handlebars.runtime.js'),
  path.join(vendorDir, 'handlebars.runtime.js')
);
writeFile(
  path.join(vendorDir, 'handlebars.runtime.d.ts'),
  "import Handlebars from 'handlebars';\nexport default Handlebars;\n"
);

copyFile(path.join(modulesDir, 'jquery', 'dist', 'jquery.js'), path.join(vendorDir, 'jquery.js'));
writeFile(
  path.join(vendorDir, 'jquery.d.ts'),
  "import jQuery from 'jquery';\nexport default jQuery;\n"
);

copyFile(
  path.join(modulesDir, 'change-case', 'dist', 'index.js'),
  path.join(vendorDir, 'change-case.js')
);
writeFile(path.join(vendorDir, 'change-case.d.ts'), "export * from 'change-case';\n");

const htmlSrcDir = path.join(modulesDir, 'html-entities', 'dist', 'esm');
const htmlDestDir = path.join(vendorDir, 'html-entities');
fs.mkdirSync(htmlDestDir, { recursive: true });
for (const file of [
  'index.js',
  'index.d.ts',
  'named-references.js',
  'numeric-unicode-map.js',
  'surrogate-pairs.js'
]) {
  copyFile(path.join(htmlSrcDir, file), path.join(htmlDestDir, file));
}

console.log('Vendor scripts regenerated.');

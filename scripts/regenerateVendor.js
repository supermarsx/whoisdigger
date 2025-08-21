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

const hbSrc = path.join(modulesDir, 'handlebars', 'dist', 'handlebars.runtime.js');
const hbDest = path.join(vendorDir, 'handlebars.runtime.js');
copyFile(hbSrc, hbDest);
let hbContent = fs.readFileSync(hbDest, 'utf8');
if (hbContent.includes('})(this, function()')) {
  hbContent = hbContent.replace('})(this, function()', '})(globalThis, function()');
  fs.writeFileSync(hbDest, hbContent);
}
if (!hbContent.includes('export default globalThis.Handlebars')) {
  fs.appendFileSync(hbDest, '\nexport default globalThis.Handlebars;\n');
}
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
  path.join(modulesDir, '@fortawesome', 'fontawesome-free', 'js', 'all.js'),
  path.join(vendorDir, 'fontawesome.js')
);
writeFile(
  path.join(vendorDir, 'fontawesome.d.ts'),
  'const fontawesome: any;\nexport default fontawesome;\n'
);

console.log('Vendor scripts regenerated.');

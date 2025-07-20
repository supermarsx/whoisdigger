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

export function regenerateVendor() {
  const hbSrc = path.join(modulesDir, 'handlebars', 'dist', 'handlebars.runtime.js');
  const hbDest = path.join(vendorDir, 'handlebars.runtime.js');
  copyFile(hbSrc, hbDest);
  let hbContent = fs.readFileSync(hbDest, 'utf8');
  if (hbContent.includes('})(this, function()')) {
    hbContent = hbContent.replace('})(this, function()', '})(globalThis, function()');
    fs.writeFileSync(hbDest, hbContent);
  }
  const hbExport = '\nexport default globalThis.Handlebars;\n';
  if (!hbContent.includes('export default globalThis.Handlebars')) {
    fs.appendFileSync(hbDest, hbExport);
  }
  writeFile(
    path.join(vendorDir, 'handlebars.runtime.d.ts'),
    "import Handlebars from 'handlebars';\nexport default Handlebars;\n"
  );

  const jqSrc = path.join(modulesDir, 'jquery', 'dist', 'jquery.js');
  const jqDest = path.join(vendorDir, 'jquery.js');
  copyFile(jqSrc, jqDest);
  const jqExport = '\nexport default window.jQuery;\n';
  const jqContent = fs.readFileSync(jqDest, 'utf8');
  if (!jqContent.includes('export default')) {
    fs.appendFileSync(jqDest, jqExport);
  }
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

  copyFile(
    path.join(modulesDir, 'change-case', 'dist', 'index.js'),
    path.join(vendorDir, 'change-case.js')
  );
  writeFile(path.join(vendorDir, 'change-case.d.ts'), "export * from 'change-case';\n");

  copyFile(
    path.join(modulesDir, 'datatables', 'media', 'js', 'jquery.dataTables.js'),
    path.join(vendorDir, 'datatables.js')
  );
  writeFile(
    path.join(vendorDir, 'datatables.d.ts'),
    'const datatables: any;\nexport default datatables;\n'
  );

  const dbgSrc = path.join(modulesDir, 'debug', 'src', 'browser.js');
  const dbgDir = path.join(vendorDir, 'debug');
  const dbgBrowserDest = path.join(dbgDir, 'browser.js');
  copyFile(dbgSrc, dbgBrowserDest);
  const dbgDest = path.join(vendorDir, 'debug.js');
  writeFile(
    dbgDest,
    "import { createRequire } from 'module';\n" +
      'const require = createRequire(import.meta.url);\n' +
      "const debug = require('./debug/browser.js');\n" +
      'export default debug;\n'
  );
  writeFile(
    path.join(vendorDir, 'debug.d.ts'),
    "import debug from 'debug';\nexport default debug;\n"
  );

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
}

if (process.argv[1] && process.argv[1].includes('regenerateVendor.mjs')) {
  regenerateVendor();
}

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

  const jqReplace = 'typeof window !== "undefined" ? window : this';
  const jqReplaceWith = 'typeof window !== "undefined" ? window : globalThis';

  let jqContent = fs.readFileSync(jqDest, 'utf8');
  if (jqContent.includes(jqReplace)) {
    jqContent = jqContent.replace(jqReplace, jqReplaceWith);
  }
  const jqAppend =
    '\nif (typeof window !== "undefined") { window.$ = window.jQuery; }\n' +
    'export default window.jQuery;\n';
  if (!jqContent.includes('export default')) {
    jqContent += jqAppend;
  }
  fs.writeFileSync(jqDest, jqContent);
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
  const dtPath = path.join(vendorDir, 'datatables.js');
  let dtContent = fs.readFileSync(dtPath, 'utf8');
  if (!dtContent.startsWith("import jQuery from 'jquery';")) {
    dtContent =
      "import jQuery from 'jquery';\n" +
      'globalThis.jQuery = jQuery;\n' +
      'globalThis.$ = jQuery;\n' +
      dtContent +
      '\nexport default window.jQuery;\n';
    fs.writeFileSync(dtPath, dtContent);
  }
  writeFile(
    path.join(vendorDir, 'datatables.d.ts'),
    'const datatables: any;\nexport default datatables;\n'
  );

  const dbgDest = path.join(vendorDir, 'debug.js');
  writeFile(
    dbgDest,
    `const namespaces = new Set();
function enabled(ns) {
  for (const pat of namespaces) {
    if (pat === '*' || ns.startsWith(pat)) return true;
  }
  return false;
}
export default function debug(ns) {
  const fn = (...args) => {
    if (enabled(ns)) {
      console.debug(\`[\${ns}]\`, ...args);
    }
  };
  fn.namespace = ns;
  return fn;
}
debug.enable = pattern => {
  pattern.split(/[,:\\s]+/).forEach(p => p && namespaces.add(p));
};
debug.disable = () => namespaces.clear();
debug.enabled = enabled;
`
  );
  writeFile(
    path.join(vendorDir, 'debug.d.ts'),
    'type DebugFn = (...args: any[]) => void;\n' +
      'export default function debug(ns: string): DebugFn;\n' +
      'export const enable: (pattern: string) => void;\n' +
      'export const disable: () => void;\n' +
      'export const enabled: (ns: string) => boolean;\n'
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

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { copyRecursiveSync } from './copyRecursive.js';
import { precompileTemplates } from './precompileTemplates.js';
import debugModule from 'debug';
import { dirnameCompat } from './dirnameCompat.js';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars/runtime.js';
import './create-esm-links.js';

const baseDir = dirnameCompat();
const debug = debugModule('postbuild');

const folders = ['html', 'html/templates', 'fonts', 'icons', 'compiled-templates', 'locales'];
const rootDir = path.join(baseDir, '..');
const appDir = path.join(rootDir, 'app');
const distDir = path.join(rootDir, 'dist', 'app');

for (const folder of folders) {
  const src = path.join(appDir, folder);
  const dest = path.join(distDir, folder);
  copyRecursiveSync(src, dest);
}

// Bundle and minify CSS from app/css into dist/app/css
debug('Bundling CSS...');
const result = spawnSync('npm', ['run', 'build:css'], { stdio: 'inherit', shell: true });
if (result.error || result.status !== 0) {
  console.error('CSS bundling failed.');
  process.exit(result.status || 1);
}

// Ensure Bulma CSS is available in the final package. We keep Bulma in
// node_modules to avoid committing the large CSS file. Here we copy the
// necessary files into the dist directory so that style.css can @import them.
const bulmaSrc = path.join(rootDir, 'node_modules', 'bulma', 'css');
const bulmaDest = path.join(distDir, 'css', 'bulma', 'css');
if (fs.existsSync(bulmaSrc)) {
  copyRecursiveSync(bulmaSrc, bulmaDest);
}

// Precompile Handlebars templates into dist/app/compiled-templates
precompileTemplates(path.join(distDir, 'compiled-templates'));

// After precompilation, register the partials with Handlebars and render
// the mainPanel template to static HTML.
const partialDir = path.join(distDir, 'compiled-templates');
const localeDir = path.join(distDir, 'locales');
const defaultLocale = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf8'));
Handlebars.registerHelper('t', (k) => defaultLocale[k] || k);

for (const file of fs.readdirSync(partialDir)) {
  if (file === 'mainPanel.js' || !file.endsWith('.js')) continue;
  const spec = (await import(path.join(partialDir, file))).default;
  Handlebars.registerPartial(path.basename(file, '.js'), Handlebars.template(spec));
}

const mainSpec = (await import(path.join(partialDir, 'mainPanel.js'))).default;
const mainTemplate = Handlebars.template(mainSpec);
const htmlOut = mainTemplate({});

const outPath = path.join(distDir, 'html', 'mainPanel.html');
fs.rmSync(outPath, { force: true });
fs.writeFileSync(outPath, htmlOut);

// Create extensionless symlinks for Node ESM

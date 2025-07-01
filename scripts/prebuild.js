import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import debugModule from 'debug';
import { precompileTemplates } from './precompileTemplates.js';
import { dirnameCompat } from './dirnameCompat.js';
import { regenerateVendor } from './regenerateVendor.mjs';

const baseDir = dirnameCompat();
const debug = debugModule('prebuild');

const rootDir = path.join(baseDir, '..');
const modulesPath = path.join(rootDir, 'node_modules');
const vendorDir = path.join(rootDir, 'app', 'vendor');

if (!fs.existsSync(modulesPath)) {
  debug('node_modules not found. Running "npm install" to install dependencies...');
  const result = spawnSync('npm', ['install'], { stdio: 'inherit', shell: true });

  if (result.error || result.status !== 0) {
    console.error('\nFailed to automatically install dependencies.');
    console.error('Please run "npm install" manually before building.');
    process.exit(result.status || 1);
  }

  debug('\nDependencies installed successfully. Continuing build...');
}

fs.mkdirSync(vendorDir, { recursive: true });
regenerateVendor();


// Precompile Handlebars templates so development builds have them ready
try {
  debug('Precompiling Handlebars templates...');
  precompileTemplates();
  debug('Templates precompiled successfully.');
} catch (err) {
  console.error('Template precompilation failed:');
  console.error(err);
  process.exit(1);
}

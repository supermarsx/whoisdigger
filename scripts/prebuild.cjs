const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const debug = require('debug')('prebuild');
const { precompileTemplates } = require('./precompileTemplates.cjs');

const rootDir = path.join(__dirname, '..');
const modulesPath = path.join(rootDir, 'node_modules');

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

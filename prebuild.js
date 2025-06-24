const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const modulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(modulesPath)) {
  console.log('node_modules not found. Running "npm install" to install dependencies...');
  const result = spawnSync('npm', ['install'], { stdio: 'inherit', shell: true });

  if (result.error || result.status !== 0) {
    console.error('\nFailed to automatically install dependencies.');
    console.error('Please run "npm install" manually before building.');
    process.exit(result.status || 1);
  }

  console.log('\nDependencies installed successfully. Continuing build...');
}

const fs = require('fs');
const path = require('path');

const modulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(modulesPath)) {
  console.error('Dependencies not installed. Run "npm install" before building.');
  process.exit(1);
}


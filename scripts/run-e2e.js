import { execSync } from 'child_process';

const isLinux = process.platform === 'linux';
const hasDisplay = Boolean(process.env.DISPLAY);

if (isLinux && !hasDisplay) {
  console.log('Skipping E2E tests on Linux due to missing X display.');
  process.exit(0);
}

const commands = [
  'npm run build',
  'npm run postbuild',
  'npm run e2e:setup',
  'wdio run wdio.conf.js'
];

for (const cmd of commands) {
  execSync(cmd, { stdio: 'inherit' });
}

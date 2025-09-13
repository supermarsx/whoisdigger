import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import path from 'path';
import os from 'os';
import fs from 'fs';
import electron from 'electron';

export const config = {
  runner: 'local',
  specs: ['./test/e2e/wdio/startup.spec.ts'],
  maxInstances: 1,
  maxInstancesPerCapability: 1,
  logLevel: 'error',
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 90000 },
  reporters: ['spec'],
  automationProtocol: 'devtools',
  capabilities: [
    {
      browserName: 'chrome',
      'wdio:devtoolsOptions': {
        ignoreDefaultArgs: true
      }
    }
  ],
  async onPrepare(config, capabilities) {
    const artifactsDir = path.join(process.cwd(), 'test', 'e2e', 'artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });
    const userDataDir = path.join(os.tmpdir(), `whoisdigger-wdio-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
    process.env.WDIO_E2E = '1';

    const net = await import('net');
    const { spawn } = await import('child_process');

    const findPort = async (port) =>
      await new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on('error', () => resolve(findPort(port + 1)));
        server.listen(port, () => {
          const { port: found } = server.address();
          server.close(() => resolve(found));
        });
      });

    const devtoolsPort = await findPort(9222);
    const appPath = process.cwd();
    const electronPath = electron;
    const child = spawn(
      electronPath,
      [
        appPath,
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--remote-debugging-port=${devtoolsPort}`,
        `--user-data-dir=${userDataDir}`
      ],
      { stdio: 'inherit' }
    );

    async function waitForDevtools(address, timeoutMs = 45000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await fetch(`http://127.0.0.1:${address}/json/version`);
          if (res.ok) return true;
        } catch {}
        await new Promise((r) => setTimeout(r, 500));
      }
      return false;
    }

    const ready = await waitForDevtools(devtoolsPort);
    if (!ready) throw new Error('DevTools endpoint not ready');

    for (const cap of Array.isArray(capabilities) ? capabilities : [capabilities]) {
      cap['goog:chromeOptions'] = { debuggerAddress: `localhost:${devtoolsPort}` };
    }

    globalThis.__ELECTRON_CHILD__ = child;
  },
  async onComplete() {
    try {
      const child = globalThis.__ELECTRON_CHILD__;
      if (child && typeof child.kill === 'function') child.kill();
    } catch {}
  }
};

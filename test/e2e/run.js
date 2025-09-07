import path from 'path';
import fs from 'fs';
import os from 'os';
import assert from 'assert';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';
import net from 'net';
import { remote } from 'webdriverio';
import { debugFactory } from '../../scripts/logger.js';
import { dirnameCompat } from '../../scripts/dirnameCompat.js';
import electron from 'electron';
import { createRequire } from 'module';

const baseDir = dirnameCompat();
const debug = debugFactory('test:e2e');

let watchdog;
(async () => {
  const electronPath = electron;
  // Launch Electron from the project root so it reads package.json "main"
  const appPath = path.resolve(baseDir, '..', '..');

  const artifactsDir = path.join(baseDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const userDataDir = path.join(os.tmpdir(), `whoisdigger-test-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';

  // Use DevTools protocol for simplicity in CI
  let chromedriverPath = null;

  const findPort = async (port) => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(findPort(port + 1)));
      server.listen(port, () => {
        const { port: found } = server.address();
        server.close(() => resolve(found));
      });
    });
  };

  const port = await findPort(9222);
  let electronProc;
  console.log('Using DevTools protocol');
  // Launch Electron directly with a remote debugging port, no chromedriver required
  electronProc = spawn(
    electronPath,
    [
      appPath,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`
    ],
    { stdio: 'inherit' }
  );
  // Wait until DevTools endpoint is available before connecting
  async function waitForDevtools(address, timeoutMs = 30000) {
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
  let browser;
  const ready = await waitForDevtools(port, 45000);
  if (!ready) {
    console.error(`DevTools not ready on port ${port}`);
  }

  try {
    // Global timeout watchdog to avoid hanging > 3 minutes
    const TIMEOUT_MS = parseInt(process.env.E2E_TIMEOUT_MS || '90000', 10);
    watchdog = setTimeout(() => {
      console.error('E2E timeout exceeded');
      try {
        electronProc.kill();
      } catch {}
      process.exit(1);
    }, TIMEOUT_MS);

    browser = await remote({
      logLevel: 'error',
      automationProtocol: 'devtools',
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': { debuggerAddress: `localhost:${port}` }
      }
    });

    await browser.pause(2000);
    try {
      const url = await browser.getUrl();
      // Log to console as well so we can see in CI logs
      console.log('Page URL:', url);
    } catch {}
    try {
      await browser.saveScreenshot(path.join(artifactsDir, 'screenshot-start.png'));
    } catch {}
    // Minimal readiness: window created and app page is loaded
    const startSwitch = Date.now();
    let switched = false;
    while (Date.now() - startSwitch < 15000 && !switched) {
      const handles = await browser.getWindowHandles();
      assert.ok(handles.length > 0, 'No windows were created');
      for (const h of handles) {
        await browser.switchToWindow(h);
        const url = await browser.getUrl();
        if (url.startsWith('file://')) {
          switched = true;
          break;
        }
      }
      if (!switched) await browser.pause(500);
    }
    const currentUrl = await browser.getUrl();
    if (!currentUrl.startsWith('file://')) {
      throw new Error(`App did not load main file URL, got: ${currentUrl}`);
    }

    await browser.saveScreenshot(path.join(artifactsDir, 'screenshot.png'));

    debug('E2E tests passed');
    await browser.deleteSession();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    try {
      if (electronProc) electronProc.kill();
    } catch {}
  }
})();

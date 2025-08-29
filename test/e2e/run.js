import path from 'path';
import fs from 'fs';
import os from 'os';
import assert from 'assert';
import { spawn } from 'child_process';
import net from 'net';
import { remote } from 'webdriverio';
import { debugFactory } from '../../scripts/logger.js';
import { dirnameCompat } from '../../scripts/dirnameCompat.js';
import electron from 'electron';

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

  // On Windows, the executable in .bin has a .cmd extension when using spawn with full path
  // Choose an available DevTools port for Electron and connect via WebdriverIO DevTools
  const chromedriverPath = null;

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
  // Launch Electron directly with a remote debugging port, no chromedriver required
  const electronProc = spawn(electronPath, [
    appPath,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`
  ], { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 1500));

  try {
    // Global timeout watchdog to avoid hanging > 3 minutes
    const TIMEOUT_MS = parseInt(process.env.E2E_TIMEOUT_MS || '90000', 10);
    watchdog = setTimeout(() => {
      console.error('E2E timeout exceeded');
      try { electronProc.kill(); } catch {}
      process.exit(1);
    }, TIMEOUT_MS);

    const browser = await remote({
      logLevel: 'error',
      automationProtocol: 'devtools',
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': { debuggerAddress: `localhost:${port}` }
      }
    });

    await browser.pause(2000);
    debug('Page URL:', await browser.getUrl());
    // Minimal readiness: window created and nav button exists
    const handles = await browser.getWindowHandles();
    assert.ok(handles.length > 0, 'No windows were created');
    const singleBtn = await browser.$('#navButtonSinglewhois');
    await singleBtn.waitForExist({ timeout: 20000 });

    await browser.saveScreenshot(path.join(artifactsDir, 'screenshot.png'));

    debug('E2E tests passed');
    await browser.deleteSession();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    try { electronProc.kill(); } catch {}
  }
})();

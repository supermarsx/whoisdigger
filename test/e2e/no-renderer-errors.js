import path from 'path';
import fs from 'fs';
import os from 'os';
import assert from 'assert';
import { spawn } from 'child_process';
import net from 'net';
import { remote } from 'webdriverio';
import electron from 'electron';
import { fileURLToPath } from 'url';

// Resolve project root from this file's location
const baseDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(baseDir, '..', '..');

// Read main entry from package.json for robustness
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const appMainRel = pkg.main || './dist/app/ts/main.js';
const appPath = path.resolve(rootDir, appMainRel);

if (!fs.existsSync(appPath)) {
  console.error(`App entry not found at ${appPath}. Did you run \"npm run build && npm run postbuild\"?`);
  process.exit(1);
}

// Ensure ESM specifier resolution matches the app
process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';

// Helper to find an open port for Chromedriver and DevTools
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

(async () => {
  const artifactsDir = path.join(baseDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const userDataDir = path.join(os.tmpdir(), `whoisdigger-test-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  let chromedriverPath = path.join(rootDir, 'node_modules', '.bin', 'chromedriver');
  if (!fs.existsSync(chromedriverPath) && fs.existsSync(`${chromedriverPath}.cmd`)) {
    chromedriverPath = `${chromedriverPath}.cmd`;
  }
  const port = await findPort(9515);
  const devtoolsPort = port + 1;

  const chromedriver = spawn(chromedriverPath, [`--port=${port}`], { stdio: 'inherit' });
  // small wait for chromedriver to start
  await new Promise((r) => setTimeout(r, 800));

  try {
    const browser = await remote({
      logLevel: 'error',
      path: '/',
      port,
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          binary: electron,
          args: [
            appPath,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--headless=new',
            `--remote-debugging-port=${devtoolsPort}`,
            `--user-data-dir=${userDataDir}`
          ]
        }
      }
    });

    // Allow renderer to load
    await browser.pause(2000);

    // Collect console logs from renderer/browser
    const logs =
      typeof browser.getRenderProcessLogs === 'function'
        ? await browser.getRenderProcessLogs()
        : await browser.getLogs('browser');

    // Consider SEVERE or messages containing typical error tokens as failures
    const errorLogs = logs.filter((l) => {
      const msg = (l?.message || '').toString();
      return (
        l?.level === 'SEVERE' ||
        /\b(Uncaught (Reference|Type)Error|Error:|TypeError:|ReferenceError:)\b/.test(msg)
      );
    });

    if (errorLogs.length) {
      // Save a screenshot to help debugging
      try {
        await browser.saveScreenshot(path.join(artifactsDir, 'renderer-errors.png'));
      } catch {}
    }

    assert.strictEqual(
      errorLogs.length,
      0,
      'Renderer console errors on launch: ' + JSON.stringify(errorLogs)
    );

    const handles = await browser.getWindowHandles();
    assert.ok(handles.length > 0, 'No browser windows were created');

    await browser.deleteSession();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    chromedriver.kill();
  }
})();

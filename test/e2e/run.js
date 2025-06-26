import path from 'path';
import fs from 'fs';
import os from 'os';
import assert from 'assert';
import { spawn } from 'child_process';
import net from 'net';
import { remote } from 'webdriverio';
import debugModule from 'debug';
import { dirnameCompat } from '../../scripts/dirnameCompat.js';
import electron from 'electron';

const baseDir = dirnameCompat();
const debug = debugModule('test:e2e');

(async () => {
  const electronPath = electron;
  const appPath = path.resolve(baseDir, '..', '..', 'dist', 'app', 'ts', 'main.js');

  const artifactsDir = path.join(baseDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const userDataDir = path.join(os.tmpdir(), `whoisdigger-test-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const chromedriverPath = path.join(baseDir, '..', '..', 'node_modules', '.bin', 'chromedriver');

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

  const port = await findPort(9515);
  const chromedriver = spawn(chromedriverPath, [`--port=${port}`], {
    stdio: 'inherit'
  });
  await new Promise((r) => setTimeout(r, 1000));

  try {
    const browser = await remote({
      logLevel: 'error',
      path: '/',
      port,
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          binary: electronPath,
          args: [
            appPath,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--headless=new',
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${userDataDir}`
          ]
        }
      }
    });

    await browser.pause(2000);

    const logs =
      typeof browser.getRenderProcessLogs === 'function'
        ? await browser.getRenderProcessLogs()
        : await browser.getLogs('browser');
    const errorLogs = logs.filter((l) => l.level === 'SEVERE' || /Error/.test(l.message));
    assert.strictEqual(errorLogs.length, 0, 'Console errors: ' + JSON.stringify(errorLogs));

    const handles = await browser.getWindowHandles();
    assert.ok(handles.length > 0, 'No windows were created');

    await browser.execute(() => {
      window.electron?.send('app:minimize');
    });
    await browser.pause(500);

    const minimized = await browser.executeAsync((done) => {
      window.electron?.invoke('app:isMinimized').then((res) => done(res));
    });
    assert.ok(minimized, 'Window did not minimize via IPC');

    // Navigate between tabs
    await browser.execute(() => document.querySelector('#navButtonBw')?.click());
    await browser.pause(500);
    let active = await browser.execute(() =>
      document.getElementById('bwMainContainer')?.classList.contains('current')
    );
    assert.ok(active, 'Bulk tab did not activate');

    await browser.execute(() => document.querySelector('#navButtonOp')?.click());
    await browser.pause(500);
    active = await browser.execute(() =>
      document.getElementById('opMainContainer')?.classList.contains('current')
    );
    assert.ok(active, 'Options tab did not activate');

    // Trigger sample bulk lookup using mock data
    await browser.execute(() => document.querySelector('#navButtonBw')?.click());
    await browser.pause(300);
    await browser.execute(() => {
      document.querySelector('#bwEntryButtonWordlist')?.click();
      const ta = document.getElementById('bwWordlistTextareaDomains');
      if (ta) ta.value = 'example';
      const tlds = document.getElementById('bwWordlistInputTlds');
      if (tlds) tlds.value = 'com';
      document.querySelector('#bwWordlistinputButtonConfirm')?.click();
    });
    await browser.pause(500);
    await browser.execute(() => {
      document.querySelector('#bwWordlistconfirmButtonStart')?.click();
    });
    await browser.pause(500);
    const processing = await browser.execute(
      () => !document.getElementById('bwProcessing')?.classList.contains('is-hidden')
    );
    assert.ok(processing, 'Bulk lookup did not start');

    // Verify dark mode toggle and persistence
    await browser.execute(() => document.querySelector('#navButtonOp')?.click());
    await browser.pause(500);
    await browser.execute(() => {
      const dark = document.getElementById('appSettings.theme.darkMode');
      const sys = document.getElementById('appSettings.theme.followSystem');
      if (sys) {
        sys.value = 'false';
        sys.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (dark) {
        dark.value = 'true';
        dark.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await browser.pause(1000);
    let theme = await browser.execute(() => document.documentElement.getAttribute('data-theme'));
    assert.strictEqual(theme, 'dark', 'Dark mode not applied');

    await browser.execute(() => location.reload());
    await browser.pause(2000);
    theme = await browser.execute(() => document.documentElement.getAttribute('data-theme'));
    assert.strictEqual(theme, 'dark', 'Dark mode not persisted after reload');

    await browser.saveScreenshot(path.join(artifactsDir, 'screenshot.png'));

    debug('E2E tests passed');
    await browser.deleteSession();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    chromedriver.kill();
  }
})();

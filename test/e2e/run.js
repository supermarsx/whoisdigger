const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');
const { remote } = require('webdriverio');

(async () => {
  const electronPath = require('electron');
  const appPath = path.join(__dirname, '..', '..', 'dist', 'app', 'ts', 'main.js');

  const chromedriverPath = path.join(
    __dirname,
    '..',
    '..',
    'node_modules',
    '.bin',
    'chromedriver'
  );
  const chromedriver = spawn(chromedriverPath, ['--port=9515'], {
    stdio: 'inherit'
  });
  await new Promise((r) => setTimeout(r, 1000));

  try {
    const browser = await remote({
      logLevel: 'error',
      path: '/',
      port: 9515,
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          binary: electronPath,
          args: [appPath, '--no-sandbox', '--disable-dev-shm-usage']
        }
      }
    });

    await browser.pause(2000);

    const handles = await browser.getWindowHandles();
    assert.ok(handles.length > 0, 'No windows were created');

    await browser.execute(() => {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('app:minimize');
    });
    await browser.pause(500);

    const minimized = await browser.execute(() => {
      const remote = require('@electron/remote');
      return remote.BrowserWindow.getFocusedWindow().isMinimized();
    });
    assert.ok(minimized, 'Window did not minimize via IPC');

    console.log('E2E tests passed');
    await browser.deleteSession();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    chromedriver.kill();
  }
})();

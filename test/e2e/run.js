const path = require('path');
const assert = require('assert');
const { Application } = require('spectron');

(async () => {
  const electronPath = require('electron');
  const appPath = path.join(__dirname, '..', '..', 'dist', 'app', 'ts', 'main.js');

  const app = new Application({
    path: electronPath,
    args: [appPath, '--no-sandbox', '--disable-dev-shm-usage'],
    startTimeout: 10000,
    waitTimeout: 10000,
    env: { ELECTRON_ENABLE_LOGGING: 'true' }
  });

  try {
    await app.start();
    await app.client.waitUntilWindowLoaded();

    const count = await app.client.getWindowCount();
    assert.ok(count > 0, 'No windows were created');

    await app.client.execute(() => {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('app:minimize');
    });
    await new Promise((r) => setTimeout(r, 500));
    const minimized = await app.browserWindow.isMinimized();
    assert.ok(minimized, 'Window did not minimize via IPC');

    console.log('E2E tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (app && app.isRunning()) {
      await app.stop();
    }
  }
})();

import fs from 'fs';
import path from 'path';
import '../test/electronMock';

import { loadSettings, settings, getUserDataPath } from '../app/ts/renderer/settings-renderer';

describe('nodeIntegration enforcement', () => {
  test('nodeIntegration remains false even when config enables it', async () => {
    await loadSettings();
    const dir = getUserDataPath();
    fs.mkdirSync(dir, { recursive: true });
    const configName = 'node-integration.json';
    settings.customConfiguration.filepath = configName;
    fs.writeFileSync(
      path.join(dir, configName),
      JSON.stringify({ appWindowWebPreferences: { nodeIntegration: true } })
    );

    const loaded = await loadSettings();

    expect(loaded.appWindowWebPreferences.nodeIntegration).toBe(false);

    fs.unlinkSync(path.join(dir, configName));
  });
});

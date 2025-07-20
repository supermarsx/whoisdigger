import fs from 'fs';
import path from 'path';
import '../test/electronMock';

import { loadSettings, settings, getUserDataPath } from '../app/ts/renderer/settings-renderer';

describe('nodeIntegration enforcement', () => {
  test('nodeIntegration remains true even when config disables it', async () => {
    const dir = getUserDataPath();
    fs.mkdirSync(dir, { recursive: true });
    const configName = 'node-integration.json';
    settings.customConfiguration.filepath = configName;
    fs.writeFileSync(
      path.join(dir, configName),
      JSON.stringify({ appWindowWebPreferences: { nodeIntegration: false } })
    );

    const loaded = await loadSettings();

    expect(loaded.appWindowWebPreferences.nodeIntegration).toBe(true);

    fs.unlinkSync(path.join(dir, configName));
  });
});

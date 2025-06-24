import fs from 'fs';
import path from 'path';
import '../test/electronMock';

describe('settings partial load', () => {
  test('missing fields fall back to defaults', async () => {
    const { loadSettings, settings, getUserDataPath } = await import('../app/ts/common/settings');
    const dir = getUserDataPath();
    fs.mkdirSync(dir, { recursive: true });

    const original = JSON.parse(JSON.stringify(settings));
    const configName = 'partial.json';
    settings.customConfiguration.filepath = configName;
    const tmpFile = path.join(dir, configName);
    fs.writeFileSync(tmpFile, JSON.stringify({ appWindow: {} }));

    const loaded = await loadSettings();

    expect(loaded).toEqual(original);

    fs.unlinkSync(tmpFile);
  });
});

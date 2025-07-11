import fs from 'fs';
import path from 'path';
import { mockGetPath } from '../test/electronMock';

import { loadSettings, settings } from '../app/ts/renderer/settings-renderer';

describe('settings load', () => {
  test('falls back to defaults when config is corrupt', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);

    const original = JSON.parse(JSON.stringify(settings));
    const configName = 'bad.json';
    settings.customConfiguration.filepath = configName;
    fs.writeFileSync(path.join(tmpDir, 'bad.json'), '{ invalid json');

    const loaded = await loadSettings();

    original.customConfiguration.filepath = configName;
    expect(loaded).toEqual(original);

    fs.unlinkSync(path.join(tmpDir, 'bad.json'));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

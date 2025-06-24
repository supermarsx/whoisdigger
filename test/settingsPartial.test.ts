import fs from 'fs';
import path from 'path';
import '../test/electronMock';
import { mockGetPath } from '../test/electronMock';

describe('settings partial load', () => {
  test('missing fields fall back to defaults', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);

    const { loadSettings, settings } = await import('../app/ts/common/settings');
    const original = JSON.parse(JSON.stringify(settings));
    const configName = 'partial.json';
    settings.customConfiguration.filepath = configName;
    fs.writeFileSync(path.join(tmpDir, configName), JSON.stringify({ appWindow: {} }));

    const loaded = await loadSettings();

    expect(loaded).toEqual(original);

    fs.unlinkSync(path.join(tmpDir, configName));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

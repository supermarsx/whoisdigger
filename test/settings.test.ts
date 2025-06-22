import fs from 'fs';
import path from 'path';

const mockGetPath = jest.fn();

jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: mockGetPath } }
}));

import { loadSettings, settings } from '../app/ts/common/settings';


describe('settings load', () => {
  test('falls back to defaults when config is corrupt', () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config')); 
    mockGetPath.mockReturnValue(tmpDir);

    const original = JSON.parse(JSON.stringify(settings));
    const configName = 'bad.json';
    settings['custom.configuration'].filepath = configName;
    fs.writeFileSync(path.join(tmpDir, 'bad.json'), '{ invalid json');

    const loaded = loadSettings();

    original['custom.configuration'].filepath = configName;
    expect(loaded).toEqual(original);

    fs.unlinkSync(path.join(tmpDir, 'bad.json'));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

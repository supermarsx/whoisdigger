import fs from 'fs';
import path from 'path';
import '../test/electronMock';
import { mockGetPath, mockIpcSend } from '../test/electronMock';
import { loadSettings, settings } from '../app/ts/common/settings';

describe('settings load error handling', () => {
  test('fails silently when read fails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(__dirname, 'config'));
    mockGetPath.mockReturnValue(tmpDir);
    settings['custom.configuration'].filepath = 'fail.json';
    jest.spyOn(fs.promises, 'readFile').mockRejectedValueOnce(new Error('fail'));

    const original = JSON.parse(JSON.stringify(settings));
    const loaded = await loadSettings();

    expect(loaded).toEqual(original);
    expect(mockIpcSend).not.toHaveBeenCalled();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: jest.fn().mockReturnValue('/tmp') } },
  dialog: { showErrorBox: jest.fn() }
}));

import fs from 'fs';
import { saveSettings, settings } from '../app/ts/common/settings';

describe('settings', () => {
  test('saveSettings returns error when write fails', () => {
    const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('write failed');
    });

    const result = saveSettings(settings);
    expect(result).toBeInstanceOf(Error);

    spy.mockRestore();
  });
});

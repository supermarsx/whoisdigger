const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const openExternalMock = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  shell: { openExternal: openExternalMock },
  app: undefined,
  Menu: {},
  dialog: { showSaveDialogSync: jest.fn() },
  remote: {},
  clipboard: { writeText: jest.fn() }
}));

import { settings } from '../app/ts/common/settings';
import '../app/ts/main/singlewhois';

describe('openUrl', () => {
  beforeEach(() => {
    openExternalMock.mockClear();
  });

  test('opens external browser for valid http url', async () => {
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'https://example.com');

    expect(openExternalMock).toHaveBeenCalledWith('https://example.com/');
  });

  test('copies url to clipboard when onlyCopy is true', async () => {
    const { clipboard } = require('electron');
    settings.lookupMisc.onlyCopy = true;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'https://example.com');

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(clipboard.writeText).toHaveBeenCalledWith('https://example.com');
  });

  test('rejects invalid url', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'ftp://example.com');

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('rejects malformed url string', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'http://');

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('rejects url without http protocol', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'example.com');

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

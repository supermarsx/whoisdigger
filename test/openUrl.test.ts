const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const loadURLMock = jest.fn();
const BrowserWindowMock = jest.fn().mockImplementation(() => ({
  setSkipTaskbar: jest.fn(),
  setMenu: jest.fn(),
  loadURL: loadURLMock,
  on: jest.fn(),
}));

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    },
  },
  BrowserWindow: BrowserWindowMock,
  app: undefined,
  Menu: {},
  dialog: { showSaveDialogSync: jest.fn() },
  remote: {},
  clipboard: { writeText: jest.fn() },
}));

import { settings } from '../app/ts/common/settings';
import '../app/ts/main/singlewhois';

describe('openUrl', () => {
  beforeEach(() => {
    BrowserWindowMock.mockClear();
    loadURLMock.mockClear();
  });

  test('opens new window for valid http url', async () => {
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'https://example.com');

    expect(BrowserWindowMock).toHaveBeenCalled();
    expect(loadURLMock).toHaveBeenCalledWith('https://example.com/');
  });

  test('rejects invalid url', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'ftp://example.com');

    expect(BrowserWindowMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('rejects malformed url string', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'http://');

    expect(BrowserWindowMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('rejects url without http protocol', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'example.com');

    expect(BrowserWindowMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

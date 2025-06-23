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
import '../app/ts/main/sw';

describe('openUrl', () => {
  beforeEach(() => {
    BrowserWindowMock.mockClear();
    loadURLMock.mockClear();
  });

  test('opens new window for valid http url', async () => {
    settings['lookup.misc'].onlyCopy = false;
    const handler = ipcMainHandlers['sw:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'https://example.com');

    expect(BrowserWindowMock).toHaveBeenCalled();
    expect(loadURLMock).toHaveBeenCalledWith('https://example.com');
  });

  test('rejects invalid url', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    settings['lookup.misc'].onlyCopy = false;
    const handler = ipcMainHandlers['sw:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'ftp://example.com');

    expect(BrowserWindowMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

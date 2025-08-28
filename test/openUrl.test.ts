const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const mockOpenExternal = jest.fn();
const mockDebug = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    },
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  shell: { openExternal: (...args: any[]) => mockOpenExternal(...args) },
  app: undefined,
  Menu: {},
  dialog: { showSaveDialogSync: jest.fn() },
  remote: {},
  clipboard: { writeText: jest.fn() }
}));

jest.mock('../app/ts/common/logger.ts', () => ({
  debugFactory: () => mockDebug
}));

import { settings } from '../app/ts/main/settings-main';
import '../app/ts/main/singlewhois';

describe('openUrl', () => {
  beforeEach(() => {
    mockOpenExternal.mockClear();
    mockDebug.mockClear();
  });

  test('opens external browser for valid http url', async () => {
    settings.lookupMisc.onlyCopy = false;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'https://example.com');

    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/');
  });

  test('copies url to clipboard when onlyCopy is true', async () => {
    const { clipboard } = require('electron');
    settings.lookupMisc.onlyCopy = true;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler({ sender: { send: jest.fn() } } as any, 'https://example.com');

    expect(mockOpenExternal).not.toHaveBeenCalled();
    expect(clipboard.writeText).toHaveBeenCalledWith('https://example.com');
  });

  test('rejects invalid url', async () => {
    settings.lookupMisc.onlyCopy = false;
    const event = { sender: { send: jest.fn() } } as any;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler(event, 'ftp://example.com');

    expect(mockOpenExternal).not.toHaveBeenCalled();
    expect(mockDebug).toHaveBeenCalledWith('Invalid protocol rejected: ftp:');
    expect(event.sender.send).toHaveBeenCalledWith('singlewhois:invalid-url');
  });

  test('rejects malformed url string', async () => {
    settings.lookupMisc.onlyCopy = false;
    const event = { sender: { send: jest.fn() } } as any;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler(event, 'http://');

    expect(mockOpenExternal).not.toHaveBeenCalled();
    expect(mockDebug).toHaveBeenCalledWith('Invalid URL rejected: http://');
    expect(event.sender.send).toHaveBeenCalledWith('singlewhois:invalid-url');
  });

  test('rejects url without http protocol', async () => {
    settings.lookupMisc.onlyCopy = false;
    const event = { sender: { send: jest.fn() } } as any;
    const handler = ipcMainHandlers['singlewhois:openlink'];
    await handler(event, 'example.com');

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(mockDebug).toHaveBeenCalledWith('Invalid URL rejected: example.com');
    expect(event.sender.send).toHaveBeenCalledWith('singlewhois:invalid-url');
  });
});

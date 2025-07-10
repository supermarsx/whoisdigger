const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

import path from 'path';
import '../app/ts/main/pathIpc';

const handler = (channel: string) => ipcMainHandlers[channel];

describe('path IPC handlers', () => {
  test('path:join matches path.join', async () => {
    const args = ['/foo', 'bar', 'baz.txt'];
    const result = await handler('path:join')({} as any, ...args);
    expect(result).toBe(path.join(...args));
  });

  test('path:basename matches path.basename', async () => {
    const p = '/foo/bar/baz.txt';
    const result = await handler('path:basename')({} as any, p);
    expect(result).toBe(path.basename(p));
  });
});

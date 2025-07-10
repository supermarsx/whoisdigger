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
import { IpcChannel } from '../app/ts/common/ipcChannels';

const getHandler = (c: string) => ipcMainHandlers[c];

describe('path IPC handlers', () => {
  test('path:join returns joined path', async () => {
    const handler = getHandler(IpcChannel.PathJoin);
    const result = await handler({}, '/tmp', 'foo', 'bar');
    expect(result).toBe(path.join('/tmp', 'foo', 'bar'));
  });

  test('path:basename returns basename', async () => {
    const handler = getHandler(IpcChannel.PathBasename);
    const input = '/tmp/foo/bar.txt';
    const result = await handler({}, input);
    expect(result).toBe(path.basename(input));
  });
});

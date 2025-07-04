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

import '../app/ts/main/bulkwhois/wordlistinput';
import { IpcChannel } from '../app/ts/common/ipcChannels';

const handler = () => ipcMainHandlers[IpcChannel.BulkwhoisInputWordlist];

describe('bw wordlist handler', () => {
  test('resolves without value', async () => {
    const res = await handler()({} as any);
    expect(res).toBeUndefined();
  });
});

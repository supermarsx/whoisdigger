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

import '../app/ts/main/bw/wordlistinput';

const handler = () => ipcMainHandlers['bw:input.wordlist'];

describe('bw wordlist handler', () => {
  test('resolves without value', async () => {
    const res = await handler()({} as any);
    expect(res).toBeUndefined();
  });
});

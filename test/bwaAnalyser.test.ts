const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  dialog: {},
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

import '../app/ts/main/bwa/analyser';

describe('bwa analyser handler', () => {
  test('forwards results to renderer', () => {
    const handler = ipcMainHandlers['bwa:analyser.start'];
    const send = jest.fn();
    const contents = { id: [1], domain: ['example.com'] } as any;

    handler({ sender: { send } } as any, contents);

    expect(send).toHaveBeenCalledWith('bwa:analyser.tablegen', contents);
  });
});

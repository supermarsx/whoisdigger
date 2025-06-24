const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    },
  },
  dialog: {},
  app: undefined,
  BrowserWindow: class {},
  Menu: {},
}));

import '../app/ts/main/bulkwhoisanalyser/analyser';

describe('bulkwhoisanalyser analyser handler', () => {
  test('forwards results to renderer', () => {
    const handler = ipcMainHandlers['bulkwhoisanalyser:analyser.start'];
    const send = jest.fn();
    const contents = { id: [1], domain: ['example.com'] } as any;

    handler({ sender: { send } } as any, contents);

    expect(send).toHaveBeenCalledWith('bulkwhoisanalyser:analyser.tablegen', contents);
  });
});

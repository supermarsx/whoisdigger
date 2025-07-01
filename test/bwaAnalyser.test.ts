const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
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
  test('returns analyser contents', async () => {
    const handler = ipcMainHandlers['bwa:analyser.start'];
    const contents = { id: [1], domain: ['example.com'] } as any;

    const result = await handler({}, contents);

    expect(result).toBe(contents);
  });
});

const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const purgeMock = jest.fn();
const clearMock = jest.fn();

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

jest.mock('../app/ts/common/requestCache', () => ({
  RequestCache: class {
    async purgeExpired() {
      return purgeMock();
    }
    async clear() {
      clearMock();
    }
  }
}));

import '../app/ts/main/cache';

describe('cache IPC handler', () => {
  test('purges expired entries', async () => {
    const handler = ipcMainHandlers['cache:purge'];
    await handler({}, { clear: false });
    expect(purgeMock).toHaveBeenCalled();
    expect(clearMock).not.toHaveBeenCalled();
  });

  test('clears all entries when clear flag set', async () => {
    const handler = ipcMainHandlers['cache:purge'];
    await handler({}, { clear: true });
    expect(clearMock).toHaveBeenCalled();
  });
});

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
  purgeExpired: () => purgeMock(),
  clearCache: () => clearMock()
}));

import '../app/ts/main/cache';

describe('cache IPC handler', () => {
  test('purges expired entries', () => {
    const handler = ipcMainHandlers['cache:purge'];
    handler({}, { clear: false });
    expect(purgeMock).toHaveBeenCalled();
    expect(clearMock).not.toHaveBeenCalled();
  });

  test('clears all entries when clear flag set', () => {
    const handler = ipcMainHandlers['cache:purge'];
    handler({}, { clear: true });
    expect(clearMock).toHaveBeenCalled();
  });
});

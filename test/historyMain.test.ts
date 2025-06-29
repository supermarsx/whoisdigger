const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const getMock = jest.fn();
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

jest.mock('../app/ts/common/history', () => ({
  getHistory: (...args: any[]) => getMock(...args),
  clearHistory: (...args: any[]) => clearMock(...args)
}));

import '../app/ts/main/history';

describe('history IPC handlers', () => {
  test('history:get returns history entries', () => {
    const entries = [{ domain: 'test.com', status: 'ok', timestamp: 1 }];
    getMock.mockReturnValue(entries);
    const result = ipcMainHandlers['history:get']();
    expect(getMock).toHaveBeenCalled();
    expect(result).toBe(entries);
  });

  test('history:clear invokes clearHistory', () => {
    ipcMainHandlers['history:clear']();
    expect(clearMock).toHaveBeenCalled();
  });
});

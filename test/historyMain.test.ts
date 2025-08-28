const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const mockGet = jest.fn();
const mockClear = jest.fn();

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
  getHistory: (...args: any[]) => mockGet(...args),
  clearHistory: (...args: any[]) => mockClear(...args)
}));

import '../app/ts/main/history';

describe('history IPC handlers', () => {
  test('history:get returns history entries', () => {
    const entries = [{ domain: 'test.com', status: 'ok', timestamp: 1 }];
    mockGet.mockReturnValue(entries);
    const result = ipcMainHandlers['history:get']();
    expect(mockGet).toHaveBeenCalled();
    expect(result).toBe(entries);
  });

  test('history:clear invokes clearHistory', () => {
    ipcMainHandlers['history:clear']();
    expect(mockClear).toHaveBeenCalled();
  });
});

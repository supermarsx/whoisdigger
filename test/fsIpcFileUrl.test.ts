import fs from 'fs';

const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

const mockReadFile = jest.fn();
const mockStat = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  app: undefined
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: (...args: any[]) => mockReadFile(...args),
      stat: (...args: any[]) => mockStat(...args)
    }
  };
});

import '../app/ts/main/fsIpc';

const getHandler = (c: string) => ipcMainHandlers[c];

describe('fsIpc file: URL normalization', () => {
  beforeEach(() => {
    mockReadFile.mockClear();
    mockStat.mockClear();
  });

  test('readFile normalizes file: URL', async () => {
    mockReadFile.mockResolvedValue('data');
    const handler = getHandler('fs:readFile');
    await handler({}, 'file:///C:/temp/test.txt', 'utf8');
    // Expect normalized native path passed to fs
    expect(mockReadFile.mock.calls[0][0]).toMatch(/temp[\\/]test\.txt$/);
  });

  test('stat normalizes file: URL', async () => {
    mockStat.mockResolvedValue({});
    const handler = getHandler('fs:stat');
    await handler({}, 'file:///C:/temp/test.txt');
    expect(mockStat.mock.calls[0][0]).toMatch(/temp[\\/]test\.txt$/);
  });
});


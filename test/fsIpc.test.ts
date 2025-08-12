import fs from 'fs';
import { EventEmitter } from 'events';

const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

const readFileMock = jest.fn();
const statMock = jest.fn();
const watchCallbacks: Array<(ev: string, filename: string) => void> = [];
const watchCloseMocks: jest.Mock[] = [];
const watchMock = jest.fn(
  (path: string, opts: fs.WatchOptions, cb: (ev: string, filename: string) => void) => {
    watchCallbacks.push(cb);
    const watcher = { close: jest.fn() } as any;
    watchCloseMocks.push(watcher.close);
    return watcher;
  }
);

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

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: (...args: any[]) => readFileMock(...args),
      stat: (...args: any[]) => statMock(...args)
    },
    watch: (...args: any[]) => watchMock(...args)
  };
});

import { cleanupWatchers } from '../app/ts/main/fsIpc';

const getHandler = (c: string) => ipcMainHandlers[c];

describe('fsIpc handlers', () => {
  beforeEach(() => {
    readFileMock.mockClear();
    statMock.mockClear();
    watchMock.mockClear();
    watchCallbacks.length = 0;
    watchCloseMocks.length = 0;
  });

  test('fs:readFile calls fs.promises.readFile', async () => {
    readFileMock.mockResolvedValue('data');
    const handler = getHandler('fs:readFile');
    await handler({}, '/tmp/file.txt', 'utf8');
    expect(readFileMock).toHaveBeenCalledWith('/tmp/file.txt', 'utf8');
  });

  test('fs:stat calls fs.promises.stat', async () => {
    statMock.mockResolvedValue({});
    const handler = getHandler('fs:stat');
    await handler({}, '/tmp/file.txt');
    expect(statMock).toHaveBeenCalledWith('/tmp/file.txt');
  });

  test('fs:watch sends events and fs:unwatch stops watcher', async () => {
    const watchHandler = getHandler('fs:watch');
    const unwatchHandler = getHandler('fs:unwatch');
    const sender = { send: jest.fn() };

    const id = await watchHandler({ sender } as any, 'pref', '/tmp/file', {});
    expect(id).toBe(1);
    expect(watchMock).toHaveBeenCalledWith('/tmp/file', {}, expect.any(Function));

    watchCallbacks[0]('change', 'file');
    expect(sender.send).toHaveBeenCalledWith('fs:watch:pref:1', {
      event: 'change',
      filename: 'file'
    });

    await unwatchHandler({}, id);
    expect(watchCloseMocks[0]).toHaveBeenCalled();
  });

  test('watcher is removed when sender is destroyed', async () => {
    const watchHandler = getHandler('fs:watch');
    const unwatchHandler = getHandler('fs:unwatch');
    const sender = new EventEmitter() as any;
    sender.send = jest.fn();

    const id = await watchHandler({ sender } as any, 'pref', '/tmp/file', {});
    sender.emit('destroyed');
    expect(watchCloseMocks[0]).toHaveBeenCalled();

    watchCloseMocks[0].mockClear();
    await unwatchHandler({}, id);
    expect(watchCloseMocks[0]).not.toHaveBeenCalled();
  });

  test('cleanupWatchers closes active watchers', async () => {
    const watchHandler = getHandler('fs:watch');
    const sender = { send: jest.fn() };

    await watchHandler({ sender } as any, 'a', '/tmp/a', {});
    await watchHandler({ sender } as any, 'b', '/tmp/b', {});

    cleanupWatchers();

    expect(watchCloseMocks[0]).toHaveBeenCalled();
    expect(watchCloseMocks[1]).toHaveBeenCalled();
  });
});

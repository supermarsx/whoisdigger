/**
 * Tests for app/ts/utils/fileWatcher.ts — FileWatcherManager, WatchOptions
 * Extended coverage beyond the existing fileWatcherManager.test.ts
 */
import { FileWatcherManager, WatchFn, WatchEvent, WatchOptions } from '../app/ts/utils/fileWatcher.js';

describe('FileWatcherManager (extended)', () => {
  test('watch() calls the provided watchFn', async () => {
    const closeFn = jest.fn();
    const watchFn: WatchFn = jest.fn().mockResolvedValue({ close: closeFn });
    const mgr = new FileWatcherManager(watchFn);

    const cb = jest.fn();
    await mgr.watch('prefix', '/path', { recursive: true }, cb);

    expect(watchFn).toHaveBeenCalledWith('prefix', '/path', { recursive: true }, cb);
  });

  test('watch() closes previous watcher before starting new one', async () => {
    const close1 = jest.fn();
    const close2 = jest.fn();
    const watchFn: WatchFn = jest.fn()
      .mockResolvedValueOnce({ close: close1 })
      .mockResolvedValueOnce({ close: close2 });
    const mgr = new FileWatcherManager(watchFn);

    await mgr.watch('p', '/a', {}, jest.fn());
    await mgr.watch('p', '/b', {}, jest.fn());

    expect(close1).toHaveBeenCalledTimes(1);
    expect(close2).not.toHaveBeenCalled();
  });

  test('close() calls the watcher close function', async () => {
    const closeFn = jest.fn();
    const watchFn: WatchFn = jest.fn().mockResolvedValue({ close: closeFn });
    const mgr = new FileWatcherManager(watchFn);

    await mgr.watch('p', '/path', {}, jest.fn());
    mgr.close();

    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  test('close() is safe to call multiple times', async () => {
    const closeFn = jest.fn();
    const watchFn: WatchFn = jest.fn().mockResolvedValue({ close: closeFn });
    const mgr = new FileWatcherManager(watchFn);

    await mgr.watch('p', '/path', {}, jest.fn());
    mgr.close();
    mgr.close();

    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  test('close() is safe before any watch()', () => {
    const watchFn: WatchFn = jest.fn();
    const mgr = new FileWatcherManager(watchFn);
    expect(() => mgr.close()).not.toThrow();
  });

  test('WatchOptions type accepts all optional fields', () => {
    const opts: WatchOptions = {
      persistent: true,
      recursive: false,
      encoding: 'utf8'
    };
    expect(opts.persistent).toBe(true);
  });

  test('WatchEvent has expected shape', () => {
    const evt: WatchEvent = { event: 'change', filename: 'test.txt' };
    expect(evt.event).toBe('change');
    expect(evt.filename).toBe('test.txt');
  });

  test('WatchEvent filename can be null', () => {
    const evt: WatchEvent = { event: 'rename', filename: null };
    expect(evt.filename).toBeNull();
  });
});

import { FileWatcherManager } from '../app/ts/utils/fileWatcher';

test('replaces existing watcher', async () => {
  const closeFirst = jest.fn();
  const closeSecond = jest.fn();
  const watchFn = jest
    .fn()
    .mockResolvedValueOnce({ close: closeFirst })
    .mockResolvedValueOnce({ close: closeSecond });

  const mgr = new FileWatcherManager(watchFn);
  await mgr.watch('a', '/tmp/1', {}, () => {});
  await mgr.watch('a', '/tmp/2', {}, () => {});

  expect(closeFirst).toHaveBeenCalled();
  mgr.close();
  expect(closeSecond).toHaveBeenCalled();
});

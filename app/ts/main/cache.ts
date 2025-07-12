import { ipcMain } from 'electron';
import { debugFactory } from '../common/logger.js';
import { RequestCache } from '../common/requestCache.js';

const debug = debugFactory('main.cache');

const requestCache = new RequestCache();

ipcMain.handle('cache:purge', async (_event, opts: { clear?: boolean } = {}) => {
  if (opts.clear) {
    await requestCache.clear();
    debug('Cleared cache via IPC');
  } else {
    await requestCache.purgeExpired();
    debug('Purged expired cache entries via IPC');
  }
});

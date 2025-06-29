import { ipcMain } from 'electron';
import debugModule from 'debug';
import { RequestCache } from '../common/requestCache.js';

const debug = debugModule('main.cache');

const requestCache = new RequestCache();

ipcMain.handle('cache:purge', (_event, opts: { clear?: boolean } = {}) => {
  if (opts.clear) {
    requestCache.clear();
    debug('Cleared cache via IPC');
  } else {
    requestCache.purgeExpired();
    debug('Purged expired cache entries via IPC');
  }
});

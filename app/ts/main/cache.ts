import { ipcMain } from 'electron';
import debugModule from 'debug';
import { purgeExpired, clearCache } from '../common/requestCache';

const debug = debugModule('main.cache');

ipcMain.handle('cache:purge', (_event, opts: { clear?: boolean } = {}) => {
  if (opts.clear) {
    clearCache();
    debug('Cleared cache via IPC');
  } else {
    purgeExpired();
    debug('Purged expired cache entries via IPC');
  }
});

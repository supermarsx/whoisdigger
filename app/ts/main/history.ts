import { ipcMain } from 'electron';
import { debugFactory } from '../common/logger.js';
import { getHistory, clearHistory } from '../common/history.js';

const debug = debugFactory('main.history');

ipcMain.handle('history:get', () => {
  const entries = getHistory();
  debug(`Returned ${entries.length} history entries`);
  return entries;
});

ipcMain.handle('history:clear', () => {
  clearHistory();
  debug('Cleared history via IPC');
});

import { ipcMain } from 'electron';
import debugModule from 'debug';
import { getHistory, clearHistory } from '../common/history';

const debug = debugModule('main.history');

ipcMain.handle('history:get', () => {
  const entries = getHistory();
  debug(`Returned ${entries.length} history entries`);
  return entries;
});

ipcMain.handle('history:clear', () => {
  clearHistory();
  debug('Cleared history via IPC');
});

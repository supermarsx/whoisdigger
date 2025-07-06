import { ipcMain } from 'electron';
import { debugFactory } from '../../common/logger.js';
const debug = debugFactory('bulkwhois.wordlistinput');
import { IpcChannel } from '../../common/ipcChannels.js';

/*
  ipcMain.handle('bulkwhois:input.wordlist', function() {...});
    Renderer requests wordlist mode
*/
ipcMain.handle(IpcChannel.BulkwhoisInputWordlist, async () => {
  debug('Using wordlist input');
  return;
});

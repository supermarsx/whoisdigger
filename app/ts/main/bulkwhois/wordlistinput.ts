import { debugFactory } from '../../common/logger.js';
const debug = debugFactory('bulkwhois.wordlistinput');
import { IpcChannel } from '../../common/ipcChannels.js';
import { handle } from '../ipc.js';

/*
  ipcMain.handle('bulkwhois:input.wordlist', function() {...});
    Renderer requests wordlist mode
*/
handle(IpcChannel.BulkwhoisInputWordlist, async () => {
  debug('Using wordlist input');
  return;
});

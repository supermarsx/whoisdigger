import { debugFactory } from '../../common/logger.js';
const debug = debugFactory('main.bwa.analyser');
import { IpcChannel } from '../../common/ipcChannels.js';
import { handle } from '../ipc.js';

/*
  ipcMain.on('bwa:analyser.start', function(...) {...});
    On event: bulk whois analyser starting up
  parameters
    event (object) - renderer object
    contents (object) - bulk whois lookup results object
 */
handle(IpcChannel.BwaAnalyserStart, async (_event, contents) => {
  debug('Generating analyser table');
  return contents;
});

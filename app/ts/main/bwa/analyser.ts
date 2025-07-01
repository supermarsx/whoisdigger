import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bwa.analyser');

const { app, BrowserWindow, Menu, ipcMain, dialog } = electron;
import { IpcChannel } from '../../common/ipcChannels.js';

/*
  ipcMain.on('bwa:analyser.start', function(...) {...});
    On event: bulk whois analyser starting up
  parameters
    event (object) - renderer object
    contents (object) - bulk whois lookup results object
 */
ipcMain.handle(IpcChannel.BwaAnalyserStart, async (_event, contents) => {
  debug('Generating analyser table');
  return contents;
});

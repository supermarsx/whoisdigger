import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw.wordlistinput');

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;
import { IpcChannel } from '../../common/ipcChannels.js';

/*
  ipcMain.handle('bulkwhois:input.wordlist', function() {...});
    Renderer requests wordlist mode
*/
ipcMain.handle(IpcChannel.BulkwhoisInputWordlist, async () => {
  debug('Using wordlist input');
  return;
});

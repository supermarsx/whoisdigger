import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw.wordlistinput');

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;
import { IpcChannel } from '../../common/ipcChannels.js';

/*
  ipcMain.handle('bw:input.wordlist', function() {...});
    Renderer requests wordlist mode
*/
ipcMain.handle(IpcChannel.BwInputWordlist, async () => {
  debug('Using wordlist input');
  return;
});

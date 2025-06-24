import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bwa.analyser');

const { app, BrowserWindow, Menu, ipcMain, dialog } = electron;

/*
  ipcMain.on('bwa:analyser.start', function(...) {...});
    On event: bulk whois analyser starting up
  parameters
    event (object) - renderer object
    contents (object) - bulk whois lookup results object
 */
ipcMain.on('bwa:analyser.start', function (event, contents) {
  const { sender } = event;

  sender.send('bwa:analyser.tablegen', contents);
});

const electron = require('electron'),
  debug = require('debug')('main.bw.wordlistinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

/*
  bw:input.wordlist
    On event: Bulk domain, wordlist input
  parameters
    event (object) - renderer object
 */
ipcMain.on('bw:input.wordlist', function(event) {
  debug("Using wordlist input");
  event.sender.send('bw:wordlistinput.confirmation');
});

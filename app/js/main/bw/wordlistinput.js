const electron = require('electron'),
  debug = require('debug')('main.bulkwhois.wordlistinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

// Bulk domain, wordlist input
ipcMain.on('bw:input.wordlist', function(event) {
  debug("Using wordlist input");
  event.sender.send('bw:wordlistinput.confirmation');
});

const electron = require('electron'),
  debug = require('debug')('main.bwa.analyser');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

/*
  bwa:analyser.start
    On event: bulk whois analyser starting up
  parameters
    event (object) - renderer object
    contents (object) - bulk whois lookup results object
 */
ipcMain.on('bwa:analyser.start', function(event, contents) {
  event.sender.send('bwa:analyser.tablegen', contents);
})

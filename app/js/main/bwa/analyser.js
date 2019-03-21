const electron = require('electron'),
  debug = require('debug')('main.bwa.analyser');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

ipcMain.on('bwa:analyser.start', function(event, contents) {
  event.sender.send('bwa:analyser.tablegen', contents);
})

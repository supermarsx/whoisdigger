const electron = require('electron'),
  debug = require('debug')('main.bw.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

var {
  appSettings
} = require('../../appsettings.js');

// File input, select file dialog
ipcMain.on('bw:input.file', function(event) {
  debug("Waiting for file selection");
  var filePath = dialog.showOpenDialog({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });
  debug("Using selected file at {0}".format(filePath));
  event.sender.send('bw:fileinput.confirmation', filePath);
});

// On drag and drop file
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bw:fileinput.confirmation', filePath, true);
});

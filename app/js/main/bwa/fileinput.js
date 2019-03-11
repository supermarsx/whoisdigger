const electron = require('electron'),
  debug = require('debug')('main.bwa.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

// File input, select file dialog
ipcMain.on('bwa:input.file', function(event) {
  debug("Waiting for file selection");
  var filePath = dialog.showOpenDialog({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });
  debug("Using selected file at {0}".format(filePath));
  event.sender.send('bwa:fileinput.confirmation', filePath);
});

// On drag and drop file
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bwa:fileinput.confirmation', filePath, true);
});

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

/*
  bw:input.file
    On event: Bulk whois input file, select file dialog
  parameters
    event (object) - renderer object
 */
ipcMain.on('bw:input.file', function(event) {
  debug("Waiting for file selection");
  var filePath = dialog.showOpenDialogSync({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });
  debug("Using selected file at {0}".format(filePath));
  event.sender.send('bw:fileinput.confirmation', filePath);
});

/*
  ondragstart
    On event: drag and dropping file
  parameters
    event (object) - renderer object
    filePath (string) - dropped file path
 */
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bw:fileinput.confirmation', filePath, true);
});

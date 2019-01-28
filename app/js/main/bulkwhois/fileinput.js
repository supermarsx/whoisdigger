const electron = require('electron'),
  debug = require('debug')('main.bulkwhois.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

// Bulk domain, file input path
ipcMain.on('bulkwhois:input.file', function(event) {
  debug("Waiting for file selection");
  var filePath = dialog.showOpenDialog({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });
  debug("Using selected file at {0}".format(filePath));
  event.sender.send('bulkwhois:fileinput.confirmation', filePath);
});

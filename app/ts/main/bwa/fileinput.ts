
const electron = require('electron'),
  debug = require('debug')('main.bwa.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

/*
  ipcMain.on('bwa:input.file', function(...) {...});
    File input, select file dialog
  parameters
    event
 */
ipcMain.on('bwa:input.file', function(event) {
  const {
    sender
  } = event;

  debug("Waiting for file selection");
  const filePath = dialog.showOpenDialogSync({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });
  debug("Using selected file at {0}".format(filePath));
  sender.send('bwa:fileinput.confirmation', filePath);
});

/*
// On drag and drop file
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bwa:fileinput.confirmation', filePath, true);
});
*/

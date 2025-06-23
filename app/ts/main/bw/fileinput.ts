// jshint esversion: 8

const electron = require('electron'),
  debug = require('debug')('main.bw.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

const settings = require('../../common/settings').load();

/*
  ipcMain.on('bw:input.file', function(...) {...});
    On event: Bulk whois input file, select file dialog
  parameters
    event (object) - renderer object
 */
ipcMain.on('bw:input.file', function(event) {
  debug("Waiting for file selection");
  const filePath = dialog.showOpenDialogSync({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });

  const {
    sender
  } = event;

  debug("Using selected file at {0}".format(filePath));
  sender.send('bw:fileinput.confirmation', filePath);
});

/*
  ipcMain.on('ondragstart', function(...) {...});
    On event: drag and dropping file
  parameters
    event (object) - renderer object
    filePath (string) - dropped file path
 */
ipcMain.on('ondragstart', function(event, filePath) {
  const {
    'app.window': appWindow
  } = settings;

  const {
    sender
  } = event;

  sender.startDrag({
    file: filePath,
    icon: appWindow.icon
  });
  
  debug('File drag filepath: {0}'.format(filePath));
  sender.send('bw:fileinput.confirmation', filePath, true);
});

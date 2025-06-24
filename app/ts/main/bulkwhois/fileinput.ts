
import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bulkwhois.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;
import { formatString } from '../../common/stringformat';

import { settings } from '../../common/settings';

/*
  ipcMain.on('bulkwhois:input.file', function(...) {...});
    On event: Bulk whois input file, select file dialog
  parameters
    event (object) - renderer object
 */
ipcMain.on('bulkwhois:input.file', function(event) {
  debug("Waiting for file selection");
  const filePath = dialog.showOpenDialogSync({
    title: "Select wordlist file",
    buttonLabel: "Open",
    properties: ['openFile', 'showHiddenFiles']
  });

  const {
    sender
  } = event;

  debug(formatString('Using selected file at {0}', filePath));
  sender.send('bulkwhois:fileinput.confirmation', filePath);
});

/*
  ipcMain.on('ondragstart', function(...) {...});
    On event: drag and dropping file
  parameters
    event (object) - renderer object
    filePath (string) - dropped file path
 */
ipcMain.on('ondragstart', function(event, filePath) {
  const { appWindow } = settings;

  const {
    sender
  } = event;

  sender.startDrag({
    file: filePath,
    icon: appWindow.icon
  });
  
  debug(formatString('File drag filepath: {0}', filePath));
  sender.send('bulkwhois:fileinput.confirmation', filePath, true);
});

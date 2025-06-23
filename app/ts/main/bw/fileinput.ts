
import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw.fileinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;
import { formatString } from '../../common/stringformat';

import { loadSettings } from '../../common/settings';

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

  debug(formatString('Using selected file at {0}', filePath));
  sender.send('bw:fileinput.confirmation', filePath);
});

/*
  ipcMain.on('ondragstart', function(...) {...});
    On event: drag and dropping file
  parameters
    event (object) - renderer object
    filePath (string) - dropped file path
 */
ipcMain.on('ondragstart', async function(event, filePath) {
  const settings = await loadSettings();
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
  
  debug(formatString('File drag filepath: {0}', filePath));
  sender.send('bw:fileinput.confirmation', filePath, true);
});

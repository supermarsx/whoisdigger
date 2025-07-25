import { ipcMain, dialog } from 'electron';
import { debugFactory } from '../../common/logger.js';
const debug = debugFactory('bulkwhois.fileinput');
import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

import { getSettings } from '../settings-main.js';

/*
  ipcMain.handle('bulkwhois:input.file', function() {...});
    Open file dialog for bulk whois input
*/
ipcMain.handle(IpcChannel.BulkwhoisInputFile, async () => {
  debug('Waiting for file selection');
  const filePath = dialog.showOpenDialogSync({
    title: 'Select wordlist file',
    buttonLabel: 'Open',
    properties: ['openFile', 'showHiddenFiles']
  });

  debug(formatString('Using selected file at {0}', filePath));
  return filePath;
});

/*
  ipcMain.on('ondragstart', function(...) {...});
    On event: drag and dropping file
  parameters
    event (object) - renderer object
    filePath (string) - dropped file path
 */
ipcMain.on('ondragstart', function (event, filePath) {
  const { appWindow } = getSettings();

  const { sender } = event;

  sender.startDrag({
    file: filePath,
    icon: appWindow.icon
  });

  debug(formatString('File drag filepath: {0}', filePath));
  sender.send(IpcChannel.BulkwhoisFileinputConfirmation, filePath, true);
});

import electron from 'electron';
import fs from 'fs';
import debugModule from 'debug';
import { processLines, ProcessOptions } from '../common/tools.js';
import { IpcChannel } from '../common/ipcChannels.js';

const { ipcMain, dialog } = electron;
const debug = debugModule('main.to');

/*
  ipcMain.on('to:input.file', function(event) {...});
    Wordlist tools input file selection
  parameters
    event (object) - renderer object
*/
ipcMain.handle(IpcChannel.ToInputFile, async () => {
  debug('Waiting for tools file selection');
  const filePath = dialog.showOpenDialogSync({
    title: 'Select wordlist file',
    buttonLabel: 'Open',
    properties: ['openFile', 'showHiddenFiles']
  });
  debug(`Using selected file at ${filePath}`);
  return filePath;
});

/*
  ipcMain.handle('to:process', async function(event, filePath, options) {...});
    Apply wordlist tools to selected file
  parameters
    event (object) - renderer object
    filePath (string) - path to wordlist file
    options (object) - processing options
*/
ipcMain.handle(
  IpcChannel.ToProcess,
  async (_event, filePath: string, options: ProcessOptions) => {
    try {
      const contents = await fs.promises.readFile(filePath, 'utf8');
      const lines = contents.split(/\r?\n/);
      const processed = processLines(lines, options);
      return processed.join('\n');
    } catch (err) {
      debug(`Processing error: ${err}`);
      throw err;
    }
  }
);

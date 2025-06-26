import electron from 'electron';
import fs from 'fs';
import debugModule from 'debug';
import { processLines, ProcessOptions } from '../common/tools';

const { ipcMain, dialog } = electron;
const debug = debugModule('main.to');

/*
  ipcMain.on('to:input.file', function(event) {...});
    Wordlist tools input file selection
  parameters
    event (object) - renderer object
*/
ipcMain.on('to:input.file', function (event) {
  debug('Waiting for tools file selection');
  const filePath = dialog.showOpenDialogSync({
    title: 'Select wordlist file',
    buttonLabel: 'Open',
    properties: ['openFile', 'showHiddenFiles']
  });
  const { sender } = event;
  debug(`Using selected file at ${filePath}`);
  sender.send('to:fileinput.confirmation', filePath);
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
  'to:process',
  async function (event, filePath: string, options: ProcessOptions) {
    const { sender } = event;
    try {
      const contents = await fs.promises.readFile(filePath, 'utf8');
      const lines = contents.split(/\r?\n/);
      const processed = processLines(lines, options);
      sender.send('to:process.result', processed.join('\n'));
    } catch (err) {
      debug(`Processing error: ${err}`);
      sender.send('to:process.error', (err as Error).message);
    }
  }
);

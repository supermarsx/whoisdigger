
import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bulkwhoisanalyser.analyser');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

/*
  ipcMain.on('bulkwhoisanalyser:analyser.start', function(...) {...});
    On event: bulk whois analyser starting up
  parameters
    event (object) - renderer object
    contents (object) - bulk whois lookup results object
 */
ipcMain.on('bulkwhoisanalyser:analyser.start', function(event, contents) {
  const {
    sender
  } = event;

  sender.send('bulkwhoisanalyser:analyser.tablegen', contents);
});

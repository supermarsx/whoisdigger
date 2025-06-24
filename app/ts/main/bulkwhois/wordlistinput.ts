
import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bulkwhois.wordlistinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

/*
  ipcMain.on('bulkwhois:input.wordlist', function(...) {...});
    On event: Bulk domain, wordlist input
  parameters
    event (object) - renderer object
 */
ipcMain.on('bulkwhois:input.wordlist', function(event) {
  const {
    sender
  } = event;

  debug("Using wordlist input");
  sender.send('bulkwhois:wordlistinput.confirmation');
});

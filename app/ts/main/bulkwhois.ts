
import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bulkwhois');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;


import './bulkwhois/fileinput'; // File input
import './bulkwhois/wordlistinput'; // Wordlist input
import './bulkwhois/process'; // Process stage
import './bulkwhois/export'; // Export stage

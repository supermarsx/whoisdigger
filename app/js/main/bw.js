const electron = require('electron'),
  debug = require('debug')('main.bulkwhois');

require('./bw/fileinput.js'); // File input
require('./bw/wordlistinput.js'); // Wordlist input
require('./bw/process.js'); // Process stage
require('./bw/export.js'); // Export stage
require('../common/stringformat.js'); // String format

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

var {
  appSettings
} = require('../appsettings.js');

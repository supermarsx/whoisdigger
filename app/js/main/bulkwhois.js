const electron = require('electron'),
  path = require('path'),
  url = require('url'),
  dedent = require('dedent-js'),
  util = require('util'),
  whois = require('../common/whoiswrapper.js'),
  conversions = require('../common/conversions.js'),
  debug = require('debug')('main.bulkwhois'),
  defaultBulkWhois = require('./bulkwhois/process.defaults.js');

require('./bulkwhois/fileinput.js'); // File input
require('./bulkwhois/wordlistinput.js'); // Wordlist input
require('./bulkwhois/process.js'); // Process stage
require('./bulkwhois/export.js'); // Export stage
require('../common/stringformat.js'); // String format

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

// On drag and drop file
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bulkwhois:fileinput.confirmation', filePath, true);
});

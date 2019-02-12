const electron = require('electron'),
  debug = require('debug')('main.bulkwhois');

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

var {
  appSettings
} = require('../appsettings.js');

// On drag and drop file
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bulkwhois:fileinput.confirmation', filePath, true);
});

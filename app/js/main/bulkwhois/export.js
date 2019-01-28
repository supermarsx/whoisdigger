const electron = require('electron'),
  path = require('path'),
  conversions = require('../../common/conversions.js');

var {
  appSettings
} = require('../../appsettings.js');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

ipcMain.on('bulkwhois:export', function(event, options) {
  
});

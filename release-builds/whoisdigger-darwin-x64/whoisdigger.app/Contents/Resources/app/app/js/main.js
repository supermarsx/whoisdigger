const electron = require('electron'),
  path = require('path'),
  url = require('url'),
  dedent = require('dedent-js'),
  util = require('util'),
  parseRawData = require('./common/parse-raw-data.js'),
  whois = require('./common/whoiswrapper.js'),
  remote = require('electron').remote,
  debug = require('debug')('main'),
  debugb = require('debug')('renderer');

require('./main/singlewhois.js');
require('./main/bulkwhois.js');
var appSettings = require('./appsettings.js');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog
} = electron;

let mainWindow,
  showFrame = true;

// when app is ready
app.on('ready', function() {
  debug('App is starting');

  // mainWindow window init
  mainWindow = new BrowserWindow({
    frame: appSettings.window.frame,
    show: appSettings.window.show,
    height: appSettings.window.height,
    width: appSettings.window.width,
    icon: appSettings.window.icon
  });

  // mainWindow HTML init
  mainWindow.loadURL(url.format({
    pathname: appSettings.url.pathname,
    protocol: appSettings.url.protocol,
    slashes: appSettings.url.slashes
  }));
  debug('Loading URL: {0}//{1}'.format(appSettings.url.protocol,appSettings.url.pathname));
  debug('Window object: %o', mainWindow);

  // mainWindow show when ready
  mainWindow.once('ready-to-show', function() {
    startup();
    debug('Showing main window');
    mainWindow.show();
  });

  // Quit App when mainWindow closed
  mainWindow.on('closed', function() {
    app.quit();
  });
});

// Startup execution
function startup() {
  debug('Doing startup checks');
  debug('Developer tools at startup: {0}'.format(appSettings.startup.devtools));
  if (appSettings.startup.devtools == true) {
    mainWindow.toggleDevTools();
  }
}

// When minimize button is clicked
ipcMain.on('app:minimize', function() {
  mainWindow.minimize();
});

ipcMain.on('app:debug', function(event, message) {
  debugb(message);
});

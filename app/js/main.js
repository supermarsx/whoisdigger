const electron = require('electron'),
  url = require('url'),
  debug = require('debug')('main'),
  debugb = require('debug')('renderer');

require('./main/sw.js');
require('./main/bw.js');
require('./main/bwa.js');

var {
  appSettings
} = require('./appsettings.js');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

let mainWindow;

// when app is ready
app.on('ready', function() {
  debug("App is starting");
  debug("'appSettings.window.show': {0}".format(appSettings.window.show));
  debug("'appSettings.window.height': {0}".format(appSettings.window.height));
  debug("'appSettings.window.width': {0}".format(appSettings.window.width));

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
  debug("'appSettings.url.protocol': {0}".format(appSettings.url.protocol));
  debug("'appSettings.url.pathname': {0}".format(appSettings.url.pathname));
  debug("'mainWindow' object: %o", mainWindow);

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
  const {
    startup
  } = appSettings;
  debug('Doing startup checks');
  debug("'startup.devtools': {0}".format(startup.devtools));
  if (startup.devtools === true) {
    mainWindow.toggleDevTools();
  }
}

// When minimize button is clicked
ipcMain.on('app:minimize', function() {
  debug("App minimized");
  mainWindow.minimize();
});

ipcMain.on('app:debug', function(event, message) {
  debugb(message);
});

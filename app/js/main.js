// jshint esversion: 8, -W104, -W069

const electron = require('electron'),
  url = require('url'),
  debug = require('debug')('main'),
  debugb = require('debug')('renderer'),
  fs = require('fs');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

require('./main/index');

var settings = require('./common/settings').load();
let mainWindow;

/*
  app.on('ready', function() {...}
    When application is ready
 */
app.on('ready', function() {
  const {
    'custom.configuration': configuration,
    'app.window': appWindow,
    'app.window.webPreferences': webPreferences,
    'app.window.url': appUrl
  } = settings;

  // Custom application settings startup
  if (fs.existsSync(app.getPath('userData') + configuration.filepath)) {
    debug("Reading persistent configurations");
    settings = fs.readFile(app.getPath('userData') + configuration.filepath);
  } else {
    debug("Using default configurations");
  }

  // Some application start debugging messages
  debug("App is starting");
  debug("'appWindow.frame': {0}".format(appWindow.frame));
  debug("'appWindow.height': {0}".format(appWindow.height));
  debug("'appWindow.width': {0}".format(appWindow.width));

  // mainWindow, Main application window initialization
  mainWindow = new BrowserWindow({
    frame: appWindow.frame, // Is basic frame shown (default: false)
    show: appWindow.show, // Show app before load (default: false)
    height: appWindow.height, // Window height in pixels (default: 700)
    width: appWindow.width, // Window width in pixels (default: 1000)
    icon: appWindow.icon, // App icon path (default: ...app.png)
    center: appWindow.center, // Center window
    minimizable: appWindow.minimizable, // Make window minimizable
    maximizable: appWindow.maximizable, // Make window maximizable
    movable: appWindow.movable, // Make window movable
    resizable: appWindow.resizable, // Make window resizable
    closable: appWindow.closable, // Make window closable
    focusable: appWindow.focusable, // Make window focusable
    alwaysOnTop: appWindow.alwaysOnTop, // Keep window on top
    fullscreen: appWindow.fullscreen, // Show window in fullscreen
    fullscreenable: appWindow.fullscreenable, // Make window able to go fullscreen
    kiosk: appWindow.kiosk, // Enable kiosk mode
    darkTheme: appWindow.darkTheme, // GTK dark theme mode
    thickFrame: appWindow.thickFrame, // Use WS_THICKFRAME style for frameless windows on Windows, which adds standard window frame. Setting it to false will remove window shadow and window animations.
    webPreferences: {
      nodeIntegration: webPreferences.nodeIntegration, // Enable node integration
      zoomFactor: webPreferences.zoomFactor, // Page zoom factor
      image: webPreferences.image, // Image support
      experimentalFeatures: webPreferences.experimentalFeatures, // Enable Chromium experimental features
      backgroundThrottling: webPreferences.backgroundThrottling, // Whether to throttle animations and timers when the page becomes background
      offscreen: webPreferences.offscreen, // enable offscreen rendering for the browser window
      spellcheck: webPreferences.spellcheck, // Enable builtin spellchecker
      enableRemoteModule: webPreferences.enableRemoteModule // Enable remote module
    }
  });

  // mainWindow, Main window URL load
  mainWindow.loadURL(url.format({
    pathname: appUrl.pathname,
    protocol: appUrl.protocol,
    slashes: appUrl.slashes
  }));

  // Some more debugging messages
  debug("'settings.url.protocol': {0}".format(appUrl.protocol));
  debug("'settings.url.pathname': {0}".format(appUrl.pathname));
  debug("'mainWindow' object: %o", mainWindow);

  /*
    mainWindow.once('ready-to-show', function() {...});
      Show main window when everything is ready
   */
  mainWindow.once('ready-to-show', function() {
    startup();
    debug('Showing main window');
    mainWindow.show();
  });

  /*
    mainWindow.on('closed', function() {...});
      Quit application when main window is closed
   */
  mainWindow.on('closed', function() {
    var {
      'app.window': appWindow
    } = settings;

    if (appWindow.closable) {
      debug('Exiting application');
      app.quit();
    }
  });
});

/*
  startup
    Main thread startup checks
 */
function startup() {
  const {
    'startup': startup
  } = settings;

  debug('Doing startup checks');
  debug("'settings.startup.developerTools': {0}".format(startup.developerTools));
  if (startup.developerTools) mainWindow.toggleDevTools();
}

/*
  ipcMain.on('app:minimize', function() {...});
    Application minimize event
 */
ipcMain.on('app:minimize', function() {
  var {
    'app.window': appWindow
  } = settings;
  if (appWindow.minimizable) {
    debug("App minimized");
    mainWindow.minimize();
  }
});

/*
  ipcMain.on('app:debug', function(...) {...});
    Application debug event
 */
ipcMain.on('app:debug', function(event, message) {
  debugb(message);
});

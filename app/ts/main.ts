// jshint esversion: 8, -W104, -W069

import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  
} from 'electron';
import * as url from 'url';
import debugModule from 'debug';
import * as fs from 'fs';
import { loadSettings } from './common/settings';
import type { Settings as BaseSettings } from './common/settings';
import { initialize as initializeRemote, enable as enableRemote } from '@electron/remote/main';
import type { IpcMainEvent } from 'electron';

const debug = debugModule('main');
const debugb = debugModule('renderer');

interface AppWindowSettings {
  frame: boolean;
  show: boolean;
  height: number;
  width: number;
  icon: string;
  center: boolean;
  minimizable: boolean;
  maximizable: boolean;
  movable: boolean;
  resizable: boolean;
  closable: boolean;
  focusable: boolean;
  alwaysOnTop: boolean;
  fullscreen: boolean;
  fullscreenable: boolean;
  kiosk: boolean;
  darkTheme: boolean;
  thickFrame: boolean;
}

interface WebPreferencesSettings {
  nodeIntegration: boolean;
  contextIsolation: boolean;
  zoomFactor: number;
  images: boolean;
  experimentalFeatures: boolean;
  backgroundThrottling: boolean;
  offscreen: boolean;
  spellcheck: boolean;
}

interface AppUrlSettings {
  pathname: string;
  protocol: string;
  slashes: boolean;
}

interface StartupSettings {
  developerTools: boolean;
}

interface MainSettings extends BaseSettings {
  'custom.configuration': { filepath: string; load: boolean; save: boolean };
  'app.window': AppWindowSettings;
  'app.window.webPreferences': WebPreferencesSettings;
  'app.window.url': AppUrlSettings;
  startup: StartupSettings;
  [key: string]: any;
}

require('./main/index');

let settings: MainSettings = loadSettings() as MainSettings;
let mainWindow: BrowserWindow;

/*
  app.on('ready', function() {...}
    When application is ready
 */
app.on('ready', function() {
  initializeRemote();
  const {
    'custom.configuration': configuration,
    'app.window': appWindow,
    'app.window.webPreferences': webPreferences,
    'app.window.url': appUrl
  } = settings;

  // Custom application settings startup
  if (fs.existsSync(app.getPath('userData') + configuration.filepath)) {
    debug("Reading persistent configurations");
    try {
      settings = JSON.parse(
        fs.readFileSync(app.getPath('userData') + configuration.filepath, 'utf8')
      ) as MainSettings;
    } catch (err: any) {
      dialog.showErrorBox('Configuration Error', err.message);
    }
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
      contextIsolation: webPreferences.contextIsolation, // Context isolation
      zoomFactor: webPreferences.zoomFactor, // Page zoom factor
      images: webPreferences.images, // Image support
      experimentalFeatures: webPreferences.experimentalFeatures, // Enable Chromium experimental features
      backgroundThrottling: webPreferences.backgroundThrottling, // Whether to throttle animations and timers when the page becomes background
      offscreen: webPreferences.offscreen, // enable offscreen rendering for the browser window
      spellcheck: webPreferences.spellcheck // Enable builtin spellchecker
    }
  });
  enableRemote(mainWindow.webContents);

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

    return;
  });

  /*
    mainWindow.on('closed', function() {...});
      Quit application when main window is closed
   */
  mainWindow.on('closed', function() {
    const {
      'app.window': appWindow
    } = settings;

    if (appWindow.closable) {
      debug('Exiting application');
      app.quit();
    }

    return;
  });

  return;
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
  if (startup.developerTools) mainWindow.webContents.toggleDevTools();

  return;
}

/*
  ipcMain.on('app:minimize', function() {...});
    Application minimize event
 */
ipcMain.on('app:minimize', function() {
  const {
    'app.window': appWindow
  } = settings;
  if (appWindow.minimizable) {
    debug("App minimized");
    mainWindow.minimize();
  }

  return;
});

/*
  ipcMain.on('app:debug', function(...) {...});
    Application debug event
 */
ipcMain.on('app:debug', function(event: IpcMainEvent, message: any) {
  debugb(message);

  return;
});

import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import debugModule from 'debug';
import { loadSettings, settings as store } from './common/settings';
import type { Settings as BaseSettings } from './common/settings';
import { formatString } from './common/stringformat';
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
  customConfiguration: { filepath: string; load: boolean; save: boolean };
  appWindow: AppWindowSettings;
  appWindowWebPreferences: WebPreferencesSettings;
  appWindowUrl: AppUrlSettings;
  startup: StartupSettings;
  [key: string]: any;
}

import './main/index';

let settings: MainSettings;
let mainWindow: BrowserWindow;

/*
  app.on('ready', function() {...}
    When application is ready
 */
app.on('ready', async function () {
  initializeRemote();
  await loadSettings();
  settings = store as MainSettings;
  const { appWindow, appWindowWebPreferences: webPreferences, appWindowUrl: appUrl } = settings;

  // Some application start debugging messages
  debug('App is starting');
  debug(formatString("'appWindow.frame': {0}", appWindow.frame));
  debug(formatString("'appWindow.height': {0}", appWindow.height));
  debug(formatString("'appWindow.width': {0}", appWindow.width));

  // mainWindow, Main application window initialization
  mainWindow = new BrowserWindow({
    frame: appWindow.frame, // Is basic frame shown (default: false)
    show: appWindow.show, // Show app before load (default: false)
    height: appWindow.height, // Window height in pixels (default: 700)
    width: appWindow.width, // Window width in pixels (default: 1000)
    icon: path.join(__dirname, appWindow.icon), // App icon path
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
  const loadPath = path.isAbsolute(appUrl.pathname)
    ? path.normalize(appUrl.pathname)
    : path.join(__dirname, appUrl.pathname);
  mainWindow.loadFile(loadPath);

  // Some more debugging messages
  debug(formatString("'settings.url.protocol': {0}", appUrl.protocol));
  debug(formatString("'settings.url.pathname': {0}", appUrl.pathname));
  debug("'mainWindow' object: %o", mainWindow);

  /*
    mainWindow.once('ready-to-show', function() {...});
      Show main window when everything is ready
   */
  mainWindow.once('ready-to-show', function () {
    startup();
    debug('Showing main window');
    mainWindow.show();

    return;
  });

  /*
    mainWindow.on('closed', function() {...});
      Quit application when main window is closed
   */
  mainWindow.on('closed', function () {
    const { appWindow } = settings;

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
  const { startup: startup } = settings;

  debug('Doing startup checks');
  debug(formatString("'settings.startup.developerTools': {0}", startup.developerTools));
  if (startup.developerTools) mainWindow.webContents.toggleDevTools();

  return;
}

/*
  ipcMain.on('app:minimize', function() {...});
    Application minimize event
 */
ipcMain.on('app:minimize', function () {
  const { appWindow } = settings;
  if (appWindow.minimizable) {
    debug('App minimized');
    mainWindow.minimize();
  }

  return;
});

/*
  ipcMain.on('app:debug', function(...) {...});
    Application debug event
 */
ipcMain.on('app:debug', function (event: IpcMainEvent, message: any) {
  debugb(message);

  return;
});

/*
  ipcMain.on('app:error', function(...) {...});
    Application error event
 */
ipcMain.on('app:error', function (event: IpcMainEvent, message: any) {
  debug(`Error: ${message}`);
  dialog.showErrorBox('Error', String(message));

  return;
});

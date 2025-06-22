// jshint esversion: 8, -W104, -W069

// Base path --> assets/html
import { ipcRenderer, dialog } from 'electron';
import * as remote from '@electron/remote';
import type { IpcRendererEvent } from 'electron';
import * as fs from 'fs';
import * as $ from 'jquery';

import './renderer/index';
import { loadSettings, Settings } from './common/settings';

(window as any).$ = $;
(window as any).jQuery = $;
(window as any).ipcRenderer = ipcRenderer;
(window as any).dialog = dialog;
(window as any).remote = remote;

let settings: Settings = loadSettings();

interface DebugMessage {
  channel: 'app:debug';
  message: string;
}

function sendDebug(message: string): void {
  const payload: DebugMessage = { channel: 'app:debug', message };
  ipcRenderer.send(payload.channel, payload.message);
}

/*
  $(document).ready(function() {...});
    When document is ready
 */
$(document).ready(function() {
  const {
    'custom.configuration': configuration
  } = settings;

  sendDebug('Document is ready');

  // Load custom configuration at startup
  if (fs.existsSync(remote.app.getPath('userData') + configuration.filepath)) {
    sendDebug('Reading persistent configurations');
    settings = JSON.parse(fs.readFileSync(remote.app.getPath('userData') + configuration.filepath, 'utf8')) as Settings;
  } else {
    sendDebug('Using default configurations');
  }

  startup();
  require('./renderer/navigation');
  
  return;
});

/*
  startup
    Application startup checks
 */
function startup() {
  const {
    'app.window.navigation': navigation
  } = settings;

  sendDebug("'navigation.developerTools': {0}".format(String(navigation.developerTools)));
  if (navigation.developerTools) $('#navTabDevtools').removeClass('is-force-hidden');

  sendDebug("'navigation.extendedcollapsed': {0}".format(String(navigation.extendedCollapsed)));
  if (navigation.extendedCollapsed) {
    $('#navButtonExpandedmenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  }

  sendDebug("'navigation.extendedmenu': {0}".format(String(navigation.enableExtendedMenu)));
  if (navigation.enableExtendedMenu) $('#navButtonExpandedmenu').addClass('is-force-hidden');

  return;
}

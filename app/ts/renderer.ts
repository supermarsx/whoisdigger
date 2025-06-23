
// Base path --> assets/html
import { ipcRenderer, dialog } from 'electron';
import * as remote from '@electron/remote';
import type { IpcRendererEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import $ from 'jquery';

import './renderer/index';
import { loadSettings, Settings } from './common/settings';
import { formatString } from './common/stringformat';

(window as any).$ = $;
(window as any).jQuery = $;
(window as any).ipcRenderer = ipcRenderer;
(window as any).dialog = dialog;
(window as any).remote = remote;

let settings: Settings;

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
$(document).ready(async function() {
  settings = await loadSettings();
  const {
    'custom.configuration': configuration
  } = settings;

  sendDebug('Document is ready');

  // Load custom configuration at startup

  const configPath = path.join(
    remote.app.getPath('userData'),
    configuration.filepath
  );
  if (fs.existsSync(configPath)) {
    sendDebug('Reading persistent configurations');
    settings = JSON.parse(
      await fs.promises.readFile(configPath, 'utf8')
    ) as Settings;
  } else {
    sendDebug('Using default configurations');
  }

  startup();
  void import('./renderer/navigation');
  
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

  sendDebug(formatString("'navigation.developerTools': {0}", String(navigation.developerTools)));
  if (navigation.developerTools) $('#navTabDevtools').removeClass('is-force-hidden');

  sendDebug(formatString("'navigation.extendedcollapsed': {0}", String(navigation.extendedCollapsed)));
  if (navigation.extendedCollapsed) {
    $('#navButtonExpandedmenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  }

  sendDebug(formatString("'navigation.extendedmenu': {0}", String(navigation.enableExtendedMenu)));
  if (navigation.enableExtendedMenu) $('#navButtonExpandedmenu').addClass('is-force-hidden');

  return;
}

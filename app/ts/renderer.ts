// Base path --> assets/html
import $ from '../vendor/jquery.js';

import './renderer/index';
import { loadSettings, settings, customSettingsLoaded } from './common/settings.js';
import { loadTranslations, registerTranslationHelpers } from './renderer/i18n.js';
import { formatString } from './common/stringformat.js';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};

(window as any).$ = $;
(window as any).jQuery = $;

interface DebugMessage {
  channel: 'app:debug';
  message: string;
}

interface ErrorMessage {
  channel: 'app:error';
  message: string;
}

function sendDebug(message: string): void {
  const payload: DebugMessage = { channel: 'app:debug', message };
  electron.send(payload.channel, payload.message);
}

function sendError(message: string): void {
  const payload: ErrorMessage = { channel: 'app:error', message };
  electron.send(payload.channel, payload.message);
}

/*
  $(document).ready(function() {...});
    When document is ready
 */
$(document).ready(async function () {
  await loadSettings();
  await loadTranslations(settings.ui.language);
  registerTranslationHelpers();
  sessionStorage.setItem('settingsLoaded', 'true');
  sessionStorage.setItem('customSettingsLoaded', customSettingsLoaded ? 'true' : 'false');
  window.dispatchEvent(new Event('settings-loaded'));
  sendDebug('Document is ready');

  startup();
  void import('./renderer/navigation.js');

  return;
});

/*
  startup
    Application startup checks
 */
function startup() {
  const { appWindowNavigation: navigation } = settings;

  sendDebug(formatString("'navigation.developerTools': {0}", String(navigation.developerTools)));
  if (navigation.developerTools) $('#navTabDevtools').removeClass('is-force-hidden');

  sendDebug(
    formatString("'navigation.extendedcollapsed': {0}", String(navigation.extendedCollapsed))
  );
  if (navigation.extendedCollapsed) {
    $('#navButtonExpandedmenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  }

  sendDebug(formatString("'navigation.extendedmenu': {0}", String(navigation.enableExtendedMenu)));
  if (!navigation.enableExtendedMenu) {
    $('#navButtonExpandedmenu').addClass('is-force-hidden');
  } else {
    $('#navButtonExpandedmenu').removeClass('is-force-hidden');
  }

  return;
}

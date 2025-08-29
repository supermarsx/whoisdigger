// Base path --> assets/html
import './renderer/index.js';
import { loadSettings, settings, customSettingsLoaded } from './renderer/settings-renderer.js';
import { loadTranslations, registerTranslationHelpers } from './renderer/i18n.js';
import { formatString } from './common/stringformat.js';
import { sendDebug, sendError } from './renderer/logger.js';
import { debugFactory } from './common/logger.js';

const electron = (window as any)
  .electron as import('../../types/renderer-electron-api.js').RendererElectronAPI;

const debug = debugFactory('renderer.entry');
debug('loaded');

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}

/*
  $(document).ready(function() {...});
    When document is ready
 */
async function onReady() {
  await loadSettings();
  await loadTranslations(settings.ui.language);
  registerTranslationHelpers();
  sessionStorage.setItem('settingsLoaded', 'true');
  sessionStorage.setItem('customSettingsLoaded', customSettingsLoaded ? 'true' : 'false');
  window.dispatchEvent(new Event('settings-loaded'));
  sendDebug('Document is ready');

  startup();
  void import('./renderer/navigation.js');
}

const isJest = typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void onReady(); });
} else if (!isJest) {
  void onReady();
}

/*
  startup
    Application startup checks
 */
function startup() {
  const { appWindowNavigation: navigation } = settings;

  sendDebug(formatString("'navigation.developerTools': {0}", String(navigation.developerTools)));
  if (navigation.developerTools) qs('#navTabDevtools')?.classList.remove('is-force-hidden');

  sendDebug(
    formatString("'navigation.extendedcollapsed': {0}", String(navigation.extendedCollapsed))
  );
  if (navigation.extendedCollapsed) {
    qs('#navButtonExpandedmenu')?.classList.toggle('is-active');
    qsa('.is-specialmenu').forEach((el) => el.classList.toggle('is-hidden'));
  }

  sendDebug(formatString("'navigation.extendedmenu': {0}", String(navigation.enableExtendedMenu)));
  if (!navigation.enableExtendedMenu) {
    qs('#navButtonExpandedmenu')?.classList.add('is-force-hidden');
  } else {
    qs('#navButtonExpandedmenu')?.classList.remove('is-force-hidden');
    // If extended menu is enabled and not collapsed, ensure special items are visible
    if (!navigation.extendedCollapsed) {
      qsa('.is-specialmenu').forEach((el) => el.classList.remove('is-hidden'));
    }
  }
  // Always ensure Options tab is discoverable
  qs('#navButtonOp')?.classList.remove('is-hidden');
  qs('#navButtonOp')?.classList.remove('is-force-hidden');
}

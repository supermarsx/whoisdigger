// Base path --> assets/html
require('./renderer/index.js');
const { loadSettings, settings, customSettingsLoaded } = require('./renderer/settings-renderer.js');
const { loadTranslations, registerTranslationHelpers } = require('./renderer/i18n.js');
const { formatString } = require('./common/stringformat.js');
const { sendDebug, sendError } = require('./renderer/logger.js');
const { debugFactory } = require('./common/logger.js');

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
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadTranslations(settings.ui.language);
  registerTranslationHelpers();
  sessionStorage.setItem('settingsLoaded', 'true');
  sessionStorage.setItem('customSettingsLoaded', customSettingsLoaded ? 'true' : 'false');
  window.dispatchEvent(new Event('settings-loaded'));
  sendDebug('Document is ready');

  startup();
  void import('./renderer/navigation.js');
});

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
  }
}

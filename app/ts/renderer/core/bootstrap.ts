import './feature-runtime.js';
import { loadSettings, settings, customSettingsLoaded } from '../state/settings-store.js';
import { loadTranslations, registerTranslationHelpers } from '../services/i18n.js';
import { formatString } from '../../common/stringformat.js';
import { sendDebug } from '../services/logger.js';
import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('renderer.core.bootstrap');
debug('loaded');

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}

async function onReady() {
  await loadSettings();
  await loadTranslations(settings.ui.language);
  registerTranslationHelpers();
  sessionStorage.setItem('settingsLoaded', 'true');
  sessionStorage.setItem('customSettingsLoaded', customSettingsLoaded ? 'true' : 'false');
  window.dispatchEvent(new Event('settings-loaded'));
  sendDebug('Document is ready');

  startup();
  void import('../features/navigation/index.js');
}

const isJest = typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void onReady();
  });
} else if (!isJest) {
  void onReady();
}

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
    if (!navigation.extendedCollapsed) {
      qsa('.is-specialmenu').forEach((el) => el.classList.remove('is-hidden'));
    }
  }

  qs('#navButtonOp')?.classList.remove('is-hidden');
  qs('#navButtonOp')?.classList.remove('is-force-hidden');
}

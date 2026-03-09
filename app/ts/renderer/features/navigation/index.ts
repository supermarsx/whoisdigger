import { formatString } from '../../../common/stringformat.js';
import { populateInputs } from '../settings/index.js';
import { settings } from '../../state/settings-store.js';
import { debugFactory } from '../../../common/logger.js';
import { app } from '../../../common/bridge/app.js';
import { listen } from '../../../common/bridge/core.js';

const debug = debugFactory('renderer.features.navigation');
debug('loaded');

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}

document.addEventListener('drop', (event: DragEvent) => {
  debug('Preventing drag and drop redirect');
  event.preventDefault();
  return false;
});

document.addEventListener('dragover', (event: DragEvent) => {
  event.preventDefault();
  return false;
});

qs('#navButtonDevtools')?.addEventListener('click', () => {
  app.toggleDevtools();
  debug('#navButtonDevtools was clicked');
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = qs('#navButtonDevtools');
  if (btn) {
    const show = !!settings.appWindowNavigation?.developerTools;
    btn.classList.toggle('is-hidden', !show);
  }
});

qsa('section.tabs ul li').forEach((li) => {
  li.addEventListener('click', () => {
    const tabName = li.getAttribute('data-tab');
    if (tabName && tabName !== '#') {
      qsa('section.tabs ul li').forEach((el) => el.classList.remove('is-active'));
      qsa('div.container .tab-content').forEach((el) => el.classList.remove('current'));
      li.classList.add('is-active');
      qs('#' + tabName)?.classList.add('current');
      if (tabName === 'settingsMainContainer') {
        populateInputs();
      }
    }
    debug(formatString('#section.tabs switched to data tab, {0}', tabName));
  });
});

qsa('.delete').forEach((btn) => {
  btn.addEventListener('click', () => {
    debug('.delete (notifications) was clicked');
    const notificationId = btn.getAttribute('data-notif');
    if (notificationId) {
      qs('#' + notificationId)?.classList.add('is-hidden');
    }
  });
});

document.addEventListener('keyup', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    debug(formatString('Hotkey, Used [ESC] key, {0}', event.key));
    if (qs('#appModalExit')?.classList.contains('is-active')) {
      qs('#appModalExitButtonNo')?.dispatchEvent(new Event('click'));
      return;
    }
    switch (true) {
      case qs('#navButtonSinglewhois')?.classList.contains('is-active'):
        debug('Hotkey, Single whois tab is active');
        switch (true) {
          case qs('#singlewhoisDomainCopied')?.classList.contains('is-active'):
            qs('#singlewhoisDomainCopiedClose')?.dispatchEvent(new Event('click'));
            break;
          case qs('#singlewhoisMessageWhois')?.classList.contains('is-active'):
            qs('#singlewhoisMessageWhoisClose')?.dispatchEvent(new Event('click'));
            break;
          case !qs('#singlewhoisTableWhoisinfo')?.classList.contains('is-hidden'):
            qs('#singlewhoisTableWhoisinfo')?.classList.add('is-hidden');
            break;
          case Boolean(document.querySelector('.notification:not(.is-hidden)')):
            qsa('.notification:not(.is-hidden)').forEach((el) => el.classList.add('is-hidden'));
            break;
        }
        break;

      case qs('#navButtonBulkwhois')?.classList.contains('is-active'):
        debug('Hotkey, Bulk whois tab is active');
        switch (true) {
          case qs('#bwProcessingModalStop')?.classList.contains('is-active'):
            qs('#bwProcessingModalStopButtonContinue')?.dispatchEvent(new Event('click'));
            break;
        }
        break;
    }
  }
});

qs('#navButtonExtendedmenu')?.addEventListener('click', () => {
  debug('#navButtonExtendedmenu was clicked');
  qs('#navButtonExtendedmenu')?.classList.toggle('is-active');
  qsa('.is-specialmenu').forEach((el) => el.classList.toggle('is-hidden'));
});

qs('#navButtonMinimize')?.addEventListener('click', () => {
  debug('#navButtonMinimize was clicked');
  void app.minimize();
});

qs('#navButtonExit')?.addEventListener('click', () => {
  debug('#navButtonExit was clicked');
  if (settings.ui?.confirmExit) {
    qs('#appModalExit')?.classList.add('is-active');
  } else {
    void app.close();
  }
});

qs('#appModalExitButtonYes')?.addEventListener('click', () => {
  debug('#appModalExitButtonYes was clicked');
  qs('#appModalExit')?.classList.remove('is-active');
  void app.close();
});

qsa('#appModalExitButtonNo, #appModalExit .delete').forEach((el) => {
  el.addEventListener('click', () => {
    debug('#appModalExitButtonNo was clicked');
    qs('#appModalExit')?.classList.remove('is-active');
  });
});

void listen('app:confirm-exit', () => {
  if (settings.ui?.confirmExit) {
    qs('#appModalExit')?.classList.add('is-active');
  } else {
    void app.close();
  }
});

qsa('.modal').forEach((modal) => {
  modal.addEventListener('click', (event: Event) => {
    const target = event.target as Element;
    if (target.classList.contains('modal') || target.classList.contains('modal-background')) {
      modal.classList.remove('is-active');
    }
  });
});

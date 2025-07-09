import { formatString } from '../common/stringformat.js';
import { populateInputs } from './settings.js';
import { settings } from './settings-renderer.js';

import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.navigation');
debug('loaded');

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}

// Prevent drag-and-drop from navigating away
document.addEventListener('drop', (event: DragEvent) => {
  debug('Preventing drag and drop redirect');
  event.preventDefault();
  return false;
});

document.addEventListener('dragover', (event: DragEvent) => {
  event.preventDefault();
  return false;
});

// Developer tools toggle button
qs('#navButtonDevtools')?.addEventListener('click', () => {
  void electron.invoke('app:toggleDevtools');
  debug('#navButtonDevtools was clicked');
});

/*
  $('section.tabs ul li').click(function() {...});
    On click: Toggle between tabs
 */
qsa('section.tabs ul li').forEach((li) => {
  li.addEventListener('click', () => {
    const tabName = li.getAttribute('data-tab');
    if (tabName && tabName !== '#') {
      qsa('section.tabs ul li').forEach((el) => el.classList.remove('is-active'));
      qsa('div.container .tab-content').forEach((el) =>
        el.classList.remove('current')
      );
      li.classList.add('is-active');
      qs('#' + tabName)?.classList.add('current');
      if (tabName === 'settingsMainContainer') {
        populateInputs();
      }
    }
    debug(formatString('#section.tabs switched to data tab, {0}', tabName));
  });
});

// Close notification buttons
qsa('.delete').forEach((btn) => {
  btn.addEventListener('click', () => {
    debug('.delete (notifications) was clicked');
    const notificationId = btn.getAttribute('data-notif');
    if (notificationId) {
      qs('#' + notificationId)?.classList.add('is-hidden');
    }
  });
});

/*
  $(document).keyup(function(...) {...});
    On keyup: Assign [ESC] key to close messages or modals
 */
document.addEventListener('keyup', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    debug(formatString('Hotkey, Used [ESC] key, {0}', event.key));
    if (qs('#appModalExit')?.classList.contains('is-active')) {
      qs('#appModalExitButtonNo')?.dispatchEvent(new Event('click'));
      return;
    }
    switch (true) {
      // Single whois tab is active
      case qs('#navButtonSinglewhois')?.classList.contains('is-active'):
        debug('Hotkey, Single whois tab is active');
        switch (true) {
          case qs('#singlewhoisDomainCopied')?.classList.contains('is-active'):
            qs('#singlewhoisDomainCopiedClose')?.dispatchEvent(new Event('click'));
            break;

          // Single whois, Dialog is open
          case qs('#singlewhoisMessageWhois')?.classList.contains('is-active'):
            qs('#singlewhoisMessageWhoisClose')?.dispatchEvent(new Event('click'));
            break;

          // Single whois, Information table not hidden
          case !qs('#singlewhoisTableWhoisinfo')?.classList.contains('is-hidden'):
            qs('#singlewhoisTableWhoisinfo')?.classList.add('is-hidden');
            break;

          // Single whois, Notification not hidden
          case Boolean(document.querySelector('.notification:not(.is-hidden)')):
            qsa('.notification:not(.is-hidden)').forEach((el) =>
              el.classList.add('is-hidden')
            );
            break;
        }
        break;

      // Bulk whois tab is active
      case qs('#navButtonBulkwhois')?.classList.contains('is-active'):
        debug('Hotkey, Bulk whois tab is active');
        switch (true) {
          // Bulk whois, is Stop dialog open
          case qs('#bwProcessingModalStop')?.classList.contains('is-active'):
            qs('#bwProcessingModalStopButtonContinue')?.dispatchEvent(new Event('click'));
            break;
        }
        break;
    }
  }
});

/*
  $('#navButtonExtendedmenu').click(function() {...});
    Button/Toggle special menu items
 */
qs('#navButtonExtendedmenu')?.addEventListener('click', () => {
  debug('#navButtonExtendedmenu was clicked');
  qs('#navButtonExtendedmenu')?.classList.toggle('is-active');
  qsa('.is-specialmenu').forEach((el) => el.classList.toggle('is-hidden'));
});

/*
  $('#navButtonMinimize').click(function() {...});
    On click: Minimize window button
 */
qs('#navButtonMinimize')?.addEventListener('click', () => {
  debug('#navButtonMinimize was clicked');
  void electron.invoke('app:minimize');
});

/*
  $('#navButtonExit').click(function() {...});
    On click: Close main window button
 */
qs('#navButtonExit')?.addEventListener('click', () => {
  debug('#navButtonExit was clicked');
  if (settings.ui?.confirmExit) {
    qs('#appModalExit')?.classList.add('is-active');
  } else {
    void electron.invoke('app:close');
  }
});

qs('#appModalExitButtonYes')?.addEventListener('click', () => {
  debug('#appModalExitButtonYes was clicked');
  qs('#appModalExit')?.classList.remove('is-active');
  electron.send('app:exit-confirmed');
});

qsa('#appModalExitButtonNo, #appModalExit .delete').forEach((el) => {
  el.addEventListener('click', () => {
    debug('#appModalExitButtonNo was clicked');
    qs('#appModalExit')?.classList.remove('is-active');
  });
});

electron.on('app:confirm-exit', function () {
  if (settings.ui?.confirmExit) {
    qs('#appModalExit')?.classList.add('is-active');
  } else {
    void electron.invoke('app:close');
  }
});

/*
  $('.modal').click(function(event) {...});
    Close modals when clicking outside the lightbox
*/
qsa('.modal').forEach((modal) => {
  modal.addEventListener('click', (event: Event) => {
    const target = event.target as Element;
    if (target.classList.contains('modal') || target.classList.contains('modal-background')) {
      modal.classList.remove('is-active');
    }
  });
});

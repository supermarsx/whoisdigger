import { formatString } from '../common/stringformat.js';
import $ from '../../vendor/jquery.js';
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

/*
  $(document).on('drop', function(...) {...});
    Prevent drop redirect
  parameters
    event (object)
 */
$(document).on('drop', function (event) {
  electron.send('app:debug', 'Preventing drag and drop redirect');
  event.preventDefault();

  return false;
});

/*
  $(document).on('dragover', function(...) {...});
    Prevent drag over redirect
  parameters
    event (object)
 */
$(document).on('dragover', function (event) {
  event.preventDefault();

  return false;
});

/*
  $('#navButtonDevtools').click(function() {...});
    On click: Button toggle developer tools
 */
$(document).on('click', '#navButtonDevtools', function () {
  void electron.invoke('app:toggleDevtools');
  electron.send('app:debug', '#navButtonDevtools was clicked');

  return;
});

/*
  $('section.tabs ul li').click(function() {...});
    On click: Toggle between tabs
 */
$(document).on('click', 'section.tabs ul li', function () {
  const tabName = $(this).attr('data-tab');

  if (tabName != '#') {
    $('section.tabs ul li').removeClass('is-active');
    $('div.container .tab-content').removeClass('current');

    $(this).addClass('is-active');
    $('#' + tabName).addClass('current');
    if (tabName === 'settingsMainContainer') {
      populateInputs();
    }
  }
  electron.send('app:debug', formatString('#section.tabs switched to data tab, {0}', tabName));

  return;
});

/*
  $('.delete').click(function() {...});
    On click: Delete open notifications
 */
$(document).on('click', '.delete', function () {
  electron.send('app:debug', '.delete (notifications) was clicked');
  const notificationId = $(this).attr('data-notif');

  $('#' + notificationId).addClass('is-hidden');

  return;
});

/*
  $(document).keyup(function(...) {...});
    On keyup: Assign [ESC] key to close messages or modals
 */
$(document).keyup(function (event) {
  if (event.keyCode === 27) {
    electron.send('app:debug', formatString('Hotkey, Used [ESC] key, {0}', event.keyCode));
    if ($('#appModalExit').hasClass('is-active')) {
      $('#appModalExitButtonNo').click();
      return;
    }
    switch (true) {
      // Single whois tab is active
      case $('#navButtonSinglewhois').hasClass('is-active'):
        electron.send('app:debug', 'Hotkey, Single whois tab is active');
        switch (true) {
          case $('#singlewhoisDomainCopied').hasClass('is-active'):
            $('#singlewhoisDomainCopiedClose').click();
            break;

          // Single whois, Dialog is open
          case $('#singlewhoisMessageWhois').hasClass('is-active'):
            $('#singlewhoisMessageWhoisClose').click();
            break;

          // Single whois, Information table not hidden
          case !$('#singlewhoisTableWhoisinfo').hasClass('is-hidden'):
            $('#singlewhoisTableWhoisinfo').addClass('is-hidden');
            break;

          // Single whois, Notification not hidden
          case !$('.notification:not(.is-hidden)').hasClass('is-hidden'):
            $('.notification:not(.is-hidden)').addClass('is-hidden');
            break;
        }
        break;

      // Bulk whois tab is active
      case $('#navButtonBw').hasClass('is-active'):
        electron.send('app:debug', 'Hotkey, Bulk whois tab is active');
        switch (true) {
          // Bulk whois, is Stop dialog open
          case $('#bwProcessingModalStop').hasClass('is-active'):
            $('#bwProcessingModalStopButtonContinue').click();
            break;
        }
        break;
    }
  }

  return;
});

/*
  $('#navButtonExtendedmenu').click(function() {...});
    Button/Toggle special menu items
 */
$(document).on('click', '#navButtonExtendedmenu', function () {
  electron.send('app:debug', '#navButtonExtendedmenu was clicked');
  $('#navButtonExtendedmenu').toggleClass('is-active');
  $('.is-specialmenu').toggleClass('is-hidden');

  return;
});

/*
  $('#navButtonMinimize').click(function() {...});
    On click: Minimize window button
 */
$(document).on('click', '#navButtonMinimize', function () {
  electron.send('app:debug', '#navButtonMinimize was clicked');
  void electron.invoke('app:minimize');

  return;
});

/*
  $('#navButtonExit').click(function() {...});
    On click: Close main window button
 */
$(document).on('click', '#navButtonExit', function () {
  electron.send('app:debug', '#navButtonExit was clicked');
  if (settings.ui?.confirmExit) {
    $('#appModalExit').addClass('is-active');
  } else {
      void electron.invoke('app:close');
  }

  return;
});

$(document).on('click', '#appModalExitButtonYes', function () {
  electron.send('app:debug', '#appModalExitButtonYes was clicked');
  $('#appModalExit').removeClass('is-active');
  electron.send('app:exit-confirmed');
});

$(document).on('click', '#appModalExitButtonNo, #appModalExit .delete', function () {
  electron.send('app:debug', '#appModalExitButtonNo was clicked');
  $('#appModalExit').removeClass('is-active');
});

electron.on('app:confirm-exit', function () {
  if (settings.ui?.confirmExit) {
    $('#appModalExit').addClass('is-active');
  } else {
      void electron.invoke('app:close');
  }
});

/*
  $('.modal').click(function(event) {...});
    Close modals when clicking outside the lightbox
*/
$(document).on('click', '.modal', function (event) {
  if ($(event.target).is('.modal') || $(event.target).is('.modal-background')) {
    $(this).removeClass('is-active');
  }

  return;
});

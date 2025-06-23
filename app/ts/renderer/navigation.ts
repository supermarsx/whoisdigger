import { formatString } from '../common/stringformat';
import $ from 'jquery';

/*
  $(document).on('drop', function(...) {...});
    Prevent drop redirect
  parameters
    event (object)
 */
$(document).on('drop', function(event) {
  ipcRenderer.send('app:debug', "Preventing drag and drop redirect");
  event.preventDefault();

  return false;
});

/*
  $(document).on('dragover', function(...) {...});
    Prevent drag over redirect
  parameters
    event (object)
 */
$(document).on('dragover', function(event) {
  event.preventDefault();

  return false;
});

/*
  $('#navButtonDevtools').click(function() {...});
    On click: Button toggle developer tools
 */
$(document).on('click', '#navButtonDevtools', function() {
  remote.getCurrentWindow().toggleDevTools();
  ipcRenderer.send('app:debug', "#navButtonDevtools was clicked");

  return;
});

/*
  $('section.tabs ul li').click(function() {...});
    On click: Toggle between tabs
 */
$(document).on('click', 'section.tabs ul li', function() {
  const tabName = $(this).attr('data-tab');

  if (tabName != '#') {
    $('section.tabs ul li').removeClass('is-active');
    $('div.container .tab-content').removeClass('current');

    $(this).addClass('is-active');
    $("#" + tabName).addClass('current');
  }
  ipcRenderer.send('app:debug', formatString('#section.tabs switched to data tab, {0}', tabName));

  return;
});

/*
  $('.delete').click(function() {...});
    On click: Delete open notifications
 */
$(document).on('click', '.delete', function() {
  ipcRenderer.send('app:debug', ".delete (notifications) was clicked");
  const notificationId = $(this).attr('data-notif');

  $('#' + notificationId).addClass('is-hidden');

  return;
});

/*
  $(document).keyup(function(...) {...});
    On keyup: Assign [ESC] key to close messages or modals
 */
$(document).keyup(function(event) {
  if (event.keyCode === 27) {
    ipcRenderer.send('app:debug', formatString('Hotkey, Used [ESC] key, {0}', event.keyCode));
    switch (true) {

      // Single whois tab is active
      case ($('#navButtonSw').hasClass('is-active')):
        ipcRenderer.send('app:debug', "Hotkey, Single whois tab is active");
        switch (true) {
          case ($('#swDomainCopied').hasClass('is-active')):
            $('#swDomainCopiedClose').click();
            break;

          // Single whois, Dialog is open
          case ($('#swMessageWhois').hasClass('is-active')):
            $('#swMessageWhoisClose').click();
            break;

            // Single whois, Information table not hidden
          case (!$('#swTableWhoisinfo').hasClass('is-hidden')):
            $('#swTableWhoisinfo').addClass('is-hidden');
            break;

            // Single whois, Notification not hidden
          case (!$('.notification:not(.is-hidden)').hasClass('is-hidden')):
            $('.notification:not(.is-hidden)').addClass('is-hidden');
            break;
        }
        break;

        // Bulk whois tab is active
      case ($('#navButtonBw').hasClass('is-active')):
        ipcRenderer.send('app:debug', "Hotkey, Bulk whois tab is active");
        switch (true) {
          // Bulk whois, is Stop dialog open
          case ($('#bwProcessingModalStop').hasClass('is-active')):
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
$(document).on('click', '#navButtonExtendedmenu', function() {
  ipcRenderer.send('app:debug', "#navButtonExtendedmenu was clicked");
  $('#navButtonExtendedmenu').toggleClass('is-active');
  $('.is-specialmenu').toggleClass('is-hidden');

  return;
});

/*
  $('#navButtonMinimize').click(function() {...});
    On click: Minimize window button
 */
$(document).on('click', '#navButtonMinimize', function() {
  ipcRenderer.send('app:debug', "#navButtonMinimize was clicked");
  remote.getCurrentWindow().minimize();

  return;
});

/*
  $('#navButtonExit').click(function() {...});
    On click: Close main window button
 */
$(document).on('click', '#navButtonExit', function() {
  ipcRenderer.send('app:debug', "#navButtonExit was clicked");
  remote.getCurrentWindow().close();

  return;
});

// Base path --> assets/html
const electron = require('electron'),
  path = require('path');

require('../js/renderer/sw.js');
require('../js/renderer/bw.js');
require('../js/renderer/bwa.js');

window.$ = window.jQuery = require('jquery');

const {
  appSettings
} = require('../js/appsettings.js');

const {
  ipcRenderer,
  remote,
  dialog
} = electron;

$(document).ready(function() { // When document is ready
  ipcRenderer.send('app:debug', "Document is ready");

  startup();

  // Button/Toggle special menu items
  $('#navButtonExtendedmenu').click(function() {
    ipcRenderer.send('app:debug', "#navButtonExtendedmenu was clicked");
    $('#navButtonExtendedmenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  });

  // Window minimize button
  $('#navButtonMinimize').click(function() {
    ipcRenderer.send('app:debug', "#navButtonMinimize was clicked");
    remote.getCurrentWindow().minimize();
  });

  // Window exit button
  $('#navButtonExit').click(function() {
    ipcRenderer.send('app:debug', "#navButtonExit was clicked");
    remote.getCurrentWindow().close();
  });

  /*
    Document event on key up, assign [ESC] key to close messages or modals
   */
  $(document).keyup(function(event) {
    if (event.keyCode === 27) {
      ipcRenderer.send('app:debug', "Hotkey, Used [ESC] key, {0}".format(event.keyCode));
      switch (true) {

        // Single whois tab is active
        case ($('#navButtonSw').hasClass('is-active')):
          ipcRenderer.send('app:debug', "Hotkey, Single whois tab is active");
          switch (true) {
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
  });

  // Prevent drop redirect
  $(document).on('drop', function(event) {
    ipcRenderer.send('app:debug', "Preventing drag and drop redirect");
    event.preventDefault();
    return false;
  });

  // Prevent drag over redirect
  $(document).on('dragover', function(event) {
    event.preventDefault();
    return false;
  });

  /*
    On click event, developer tools button toggle
   */
  $('#navButtonDevtools').click(function() {
    remote.getCurrentWindow().toggleDevTools();
    ipcRenderer.send('app:debug', "#navButtonDevtools was clicked");
  });

  // Toggle between tabs
  $('section.tabs ul li').click(function() {
    var tabName = $(this).attr('data-tab');

    if (tabName != '#') {
      $('section.tabs ul li').removeClass('is-active');
      $('div.container .tab-content').removeClass('current');

      $(this).addClass('is-active');
      $("#" + tabName).addClass('current');
    }
    ipcRenderer.send('app:debug', "#section.tabs switched to data tab, {0}".format(tabName));
  });

  // Delete notifications
  $('.delete').click(function() {
    ipcRenderer.send('app:debug', ".delete (notifications) was clicked");
    var notificationId = $(this).attr('data-notif');

    $('#' + notificationId).addClass('is-hidden');
  });

});

// Startup checks
function startup() {
  var {
    navigation
  } = appSettings;

  ipcRenderer.send('app:debug', "'navigation.devtools': {0}".format(navigation.devtools));
  if (navigation.devtools === true) {
    $('#navTabDevtools').removeClass('is-force-hidden');
  }

  ipcRenderer.send('app:debug', "'navigation.extendedcollapsed': {0}".format(navigation.extendedcollapsed));
  if (navigation.extendedcollapsed === true) {
    $('#navButtonExpandedmenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  }

  ipcRenderer.send('app:debug', "'navigation.extendedmenu': {0}".format(navigation.extendedmenu));
  if (navigation.extendedmenu === false) {
    $('#navButtonExpandedmenu').addClass('is-force-hidden');
  }
}

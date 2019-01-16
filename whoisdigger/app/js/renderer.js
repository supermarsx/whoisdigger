// Base path --> assets/html
const electron = require('electron'),
  path = require('path'),
  url = require('url'),
  dedent = require('dedent-js'),
  util = require('util'),
  whois = require('whois'),
  parseRawData = require('../js/common/parse-raw-data.js'),
  lookup = util.promisify(whois.lookup),
  dialog = require('electron').remote,
  fs = require("fs"),
  remote = require('electron').remote;

require('../js/renderer/singlewhois.js');
require('../js/renderer/bulkwhois.js');

var appSettings = require('../js/appsettings.js');

const {
  ipcRenderer
} = require('electron');

$(document).ready(function() { // When document is ready
  ipcRenderer.send('app:debug', "Document is ready");
  //loadContents();
  startup();

  // Button/Toggle special menu items
  $('#navButtonExpandedMenu').click(function() {
    ipcRenderer.send('app:debug', "#navButtonExpandedMenu was clicked");
    $('#navButtonExpandedMenu').toggleClass('is-active');
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

  // Assign [ESC] to close message/modal
  $(document).keyup(function(event) {
    if (event.keyCode == 27) {
      ipcRenderer.send('app:debug', "Used [ESC] key, {0}".format(event.keyCode));
      if ($('#swMessageWhois').hasClass('is-active')) {
        $('#swMessageWhoisClose').click();
      } else if ($('.notification')) {
        $('.notification:not(.is-hidden)').addClass('is-hidden');
        if ($('#swTableWhoisInfo:not(.is-hidden)')) {
          $('#swTableWhoisInfo').addClass('is-hidden');
        }
      }
    }
  });

  // Prevent drop redirect
  document.addEventListener('drop', function(event) {
    ipcRenderer.send('app:debug', "Preventing drag and drop redirect");
    event.preventDefault();
    return false;
  }, false);

  // Toggle devtools
  $('#navTabDevTools').click(function() {
    remote.getCurrentWindow().toggleDevTools();
    ipcRenderer.send('app:debug', "#navTabDevTools was clicked");
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
  ipcRenderer.send('app:debug', "Checking renderer startup vars");
  ipcRenderer.send('app:debug', "Show Developer tools toggle: {0}".format(appSettings.navigation.devtools));
  if (appSettings.navigation.devtools == true) {
    $('#navTabDevTools').removeClass('is-force-hidden');
  }
  ipcRenderer.send('app:debug', "Show extended menu collapsed: {0}".format(appSettings.navigation.extendedcollapsed));
  if (appSettings.navigation.extendedcollapsed == true) {
    $('#navButtonExpandedMenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  }
  ipcRenderer.send('app:debug', "Show extended menu collapse button: {0}".format(appSettings.navigation.extendedmenu));
  if (appSettings.navigation.extendedmenu == false) {
    $('#navButtonExpandedMenu').addClass('is-force-hidden');
  }
}

// Load different panel parts //////////////////
function loadContents() {
    $('#include.navbar').load(path.join(__dirname, '../html/navigation/navbar.html'));
    $('#include.navbar.tabs').load(path.join(__dirname, '../html/navigation/navbar.tabs.html'));
}

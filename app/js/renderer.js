// jshint esversion: 8, -W104, -W069

// Base path --> assets/html
const electron = require('electron'),
  path = require('path'),
  app = electron.remote.app,
  fs = require('fs');

window.$ = window.jQuery = require('jquery');

require('../js/renderer/sw');
require('../js/renderer/bw');
require('../js/renderer/bwa');

var settings = require('../js/common/settings').load();

const {
  ipcRenderer,
  remote,
  dialog
} = electron;

/*
  $(document).ready(function() {...}
    When document is ready
 */
$(document).ready(function() {
  const {
    'custom.configuration': configuration
  } = settings;

  ipcRenderer.send('app:debug', "Document is ready");

  // Load custom configuration at startup
  if (fs.existsSync(app.getPath('userData') + configuration.filepath) && configuration.load) {
    ipcRenderer.send('app:debug', "Reading persistent configurations");
    settings = fs.readFile(app.getPath('userData') + configuration.filepath);
  } else {
    ipcRenderer.send('app:debug', "Using default configurations");
  }

  startup();
  require('../js/renderer/navigation');

});

/*
  startup
    Application startup checks
 */
function startup() {
  var {
    'app.window.navigation': navigation
  } = settings;


  ipcRenderer.send('app:debug', "'navigation['developer.tools']': {0}".format(navigation.developerTools));
  if (navigation.developerTools === true) {
    $('#navTabDevtools').removeClass('is-force-hidden');
  }

  ipcRenderer.send('app:debug', "'navigation.extendedcollapsed': {0}".format(navigation.extendedCollapsed));
  if (navigation.extendedCollapsed === true) {
    $('#navButtonExpandedmenu').toggleClass('is-active');
    $('.is-specialmenu').toggleClass('is-hidden');
  }

  ipcRenderer.send('app:debug', "'navigation.extendedmenu': {0}".format(navigation.enableExtendedMenu));
  if (navigation.enableExtendedMenu === false) {
    $('#navButtonExpandedmenu').addClass('is-force-hidden');
  }
}

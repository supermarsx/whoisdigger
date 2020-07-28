// jshint esversion: 8, -W069

const fs = require('fs'),
  electron = require('electron'),
  {
    app,
    remote
  } = electron,
  debug = require('debug')('common.settings');

require('./stringFormat');

var {
  settings
} = fs.existsSync('./appSettings') ?
  require('./appSettings') :
  require('../appSettings');

/*
  Detect if is Renderer
 */
var isRenderer = (function() {
  if (electron.app === undefined) {
    debug("Is renderer");
    return false;
  } else {
    debug("Is main");
    return true;
  }
})();

var filePath = isRenderer ? app.getPath('userData') + settings['custom.configuration']['filepath'] :
  remote.app.getPath('userData') + settings['custom.configuration']['filepath'];

/*
  loadSettings
    Loads custom configurations from file or defaults
 */
function loadSettings() {
  const {
    'custom.configuration': configuration
  } = settings;

  if (configuration.load) {
    try {
      settings = fs.readFileSync(filePath);
      debug("Loaded custom configuration at {0}".format(filePath));
    } catch (e) {
      debug("Failed to load custom configuration with error: {0}".format(e));
    }
  }

  return settings;
}

/*
  saveSettings
    Save custom configurations
  parameters
    settings (object) - Current custom configurations to be saved
 */
function saveSettings(settings) {
  const {
    'custom.configuration': configuration
  } = settings;

  if (configuration.save) {
    try {
      fs.writeFileSync(filePath, settings);
      debug("Saved custom configuration at {0}".format(filePath));
      return 'SAVED';
    } catch (e) {
      debug("Failed to save custom configuration with error: {0}".format(filePath));
      return e;
    }
  }

}

module.exports = {
  default: settings,
  loadSettings: loadSettings,
  load: loadSettings,
  saveSettings: saveSettings,
  save: saveSettings
};

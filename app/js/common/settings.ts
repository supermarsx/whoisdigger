// jshint esversion: 8, -W069

import * as fs from 'fs';
import * as electron from 'electron';
const { app, remote } = electron;
import debugModule from 'debug';
const debug = debugModule('common.settings');

import './stringformat';

export interface Settings {
  'lookup.conversion': { enabled: boolean; algorithm: string };
  'lookup.general': {
    type: string;
    psl: boolean;
    server: string;
    verbose: boolean;
    follow: number;
    timeout: number;
    timeBetween: number;
    useDnsTimeBetweenOverride: boolean;
    dnsTimeBetween: number;
  };
  'lookup.randomize.follow': { randomize: boolean; minimumDepth: number; maximumDepth: number };
  'lookup.randomize.timeout': { randomize: boolean; minimum: number; maximum: number };
  'lookup.randomize.timeBetween': { randomize: boolean; minimum: number; maximum: number };
  'lookup.assumptions': { uniregistry: boolean; ratelimit: boolean; unparsable: boolean; dnsFailureUnavailable: boolean };
  'custom.configuration': { filepath: string; load: boolean; save: boolean };
  [key: string]: any;
}

const settingsModule: { settings: Settings } = fs.existsSync('./appSettings') ?
  require('./appSettings') :
  require('../appSettings');
let { settings } = settingsModule;
export { settings };
export default settings;

/*
  Detect if is Renderer
 */
const isRenderer = (function() {
  if (electron.app === undefined) {
    debug("Is renderer");
    return false;
  } else {
    debug("Is main");
    return true;
  }
})();

const filePath = isRenderer ?
  app.getPath('userData') + settings['custom.configuration']['filepath'] :
  remote.app.getPath('userData') + settings['custom.configuration']['filepath'];

/*
  loadSettings
    Loads custom configurations from file or defaults
 */
export function loadSettings(): Settings {
  const {
    'custom.configuration': configuration
  } = settings;

  if (configuration.load) {
    try {
      settings = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Settings;
      debug(`Loaded custom configuration at ${filePath}`);
    } catch (e) {
      debug(`Failed to load custom configuration with error: ${e}`);
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
export function saveSettings(settings: Settings): string | Error | undefined {
  const {
    'custom.configuration': configuration
  } = settings;

  if (configuration.save) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(settings));
      debug(`Saved custom configuration at ${filePath}`);
      return 'SAVED';
    } catch (e) {
      debug(`Failed to save custom configuration with error: ${e}`);
      return e as Error;
    }
  }

}



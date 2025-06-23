// jshint esversion: 8, -W069

import * as fs from 'fs';
import * as path from 'path';
import * as electron from 'electron';
const { app } = electron;
const remote = (electron as any).remote;
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
  theme: { darkMode: boolean };
  [key: string]: any;
}

import defaultAppSettings from '../appsettings';

let settings = (defaultAppSettings as any).settings as Settings;
export { settings };
export default settings;

/*
  Detect if running in the main Electron process
 */
const isMainProcess = ((): boolean => {
  if (electron.app === undefined) {
    debug('Is renderer');
    return false;
  } else {
    debug('Is main');
    return true;
  }
})();


const userDataPath = isMainProcess
  ? app.getPath('userData')
  : remote?.app?.getPath('userData') ?? '';

function getUserDataPath(): string {
  return userDataPath;
}
const filePath = isMainProcess
  ? path.join(app.getPath('userData'), settings['custom.configuration'].filepath)
  : path.join(
      remote?.app?.getPath('userData') ?? '',
      settings['custom.configuration'].filepath
    );

/*
  load
    Loads custom configurations from file or defaults
 */
export function load(): Settings {
  const {
    'custom.configuration': configuration
  } = settings;

  if (configuration.load) {
    try {
      const filePath =
        path.join(
          getUserDataPath(),
          settings['custom.configuration'].filepath
        );
      const raw = fs.readFileSync(filePath, 'utf8');
      try {
        settings = JSON.parse(raw) as Settings;
        debug(`Loaded custom configuration at ${filePath}`);
      } catch (parseError) {
        debug(`Failed to parse custom configuration with error: ${parseError}`);
      }
    } catch (e) {
      debug(`Failed to load custom configuration with error: ${e}`);
    }
  }

  return settings;
}

/*
  save
    Save custom configurations
  parameters
    settings (object) - Current custom configurations to be saved
 */
export function save(settings: Settings): string | Error | undefined {
  const {
    'custom.configuration': configuration
  } = settings;

  if (configuration.save) {
    try {
      const filePath =
        path.join(
          getUserDataPath(),
          settings['custom.configuration'].filepath
        );
      fs.writeFileSync(filePath, JSON.stringify(settings));
      debug(`Saved custom configuration at ${filePath}`);
      return 'SAVED';
    } catch (e) {
      debug(`Failed to save custom configuration with error: ${e}`);
      return e as Error;
    }
  }

}

export const loadSettings = load;
export const saveSettings = save;



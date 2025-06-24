import * as fs from 'fs';
import * as path from 'path';
import * as electron from 'electron';
let remote: typeof import('@electron/remote') | undefined;
try {
  // Dynamically require to avoid issues when Electron bindings are unavailable
  remote = require('@electron/remote');
} catch {
  remote = (electron as any).remote;
}
const { app, ipcRenderer } = electron as any;
import debugModule from 'debug';
const debug = debugModule('common.settings');

let watcher: fs.FSWatcher | undefined;

export interface Settings {
  lookupConversion: { enabled: boolean; algorithm: string };
  lookupGeneral: {
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
  lookupRandomizeFollow: { randomize: boolean; minimumDepth: number; maximumDepth: number };
  lookupRandomizeTimeout: { randomize: boolean; minimum: number; maximum: number };
  lookupRandomizeTimeBetween: { randomize: boolean; minimum: number; maximum: number };
  lookupAssumptions: {
    uniregistry: boolean;
    ratelimit: boolean;
    unparsable: boolean;
    dnsFailureUnavailable: boolean;
    expired?: boolean;
  };
  customConfiguration: { filepath: string; load: boolean; save: boolean };
  theme: { darkMode: boolean };
  [key: string]: any;
}

const rawModule = fs.existsSync('./appsettings')
  ? require('./appsettings')
  : require('../appsettings');
const settingsModule: { settings: Settings } = rawModule.settings ? rawModule : rawModule.default;
let { settings } = settingsModule;
const defaultCustomConfiguration = settings.customConfiguration;
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
  : (remote?.app?.getPath('userData') ?? '');

function getUserDataPath(): string {
  return userDataPath;
}

function getCustomConfiguration(): { filepath: string; load: boolean; save: boolean } {
  return settings.customConfiguration ?? defaultCustomConfiguration;
}

function getConfigFile(): string {
  const { filepath } = getCustomConfiguration();
  return path.join(getUserDataPath(), filepath);
}

function watchConfig(): void {
  if (watcher) {
    watcher.close();
  }
  const cfg = getConfigFile();
  if (!fs.existsSync(cfg)) {
    return;
  }
  watcher = fs.watch(cfg, { persistent: false }, async (event) => {
    if (event !== 'change') return;
    try {
      const raw = await fs.promises.readFile(cfg, 'utf8');
      settings = JSON.parse(raw) as Settings;
      debug(`Reloaded custom configuration at ${cfg}`);
    } catch (e) {
      debug(`Failed to reload configuration with error: ${e}`);
      // Silently ignore reload errors
    }
  });
}

/*
  load
    Loads custom configurations from file or defaults
 */
export async function load(): Promise<Settings> {
  const configuration = getCustomConfiguration();

  if (configuration && configuration.load) {
    try {
      const filePath = path.join(getUserDataPath(), configuration.filepath);
      const raw = await fs.promises.readFile(filePath, 'utf8');
      try {
        settings = JSON.parse(raw) as Settings;
        debug(`Loaded custom configuration at ${filePath}`);
      } catch (parseError) {
        debug(`Failed to parse custom configuration with error: ${parseError}`);
      }
    } catch (e) {
      debug(`Failed to load custom configuration with error: ${e}`);
      // Silently ignore loading errors
    }
  }

  watchConfig();
  return settings;
}

/*
  save
    Save custom configurations
  parameters
    settings (object) - Current custom configurations to be saved
 */
export async function save(newSettings: Settings): Promise<string | Error | undefined> {
  const configuration = newSettings.customConfiguration ?? defaultCustomConfiguration;

  if (configuration && configuration.save) {
    try {
      const filePath = path.join(getUserDataPath(), configuration.filepath);
      await fs.promises.writeFile(filePath, JSON.stringify(newSettings, null, 2));
      debug(`Saved custom configuration at ${filePath}`);
      settings = newSettings;
      return 'SAVED';
    } catch (e) {
      debug(`Failed to save custom configuration with error: ${e}`);
      return e as Error;
    }
  }
  settings = newSettings;
}

export const loadSettings = load;
export const saveSettings = save;

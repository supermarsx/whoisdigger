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
  lookupProxy: {
    enable: boolean;
    mode: string;
    multimode: string;
    check: boolean;
    checktype: string;
    single?: string;
    list?: string[];
  };
  lookupAssumptions: {
    uniregistry: boolean;
    ratelimit: boolean;
    unparsable: boolean;
    dnsFailureUnavailable: boolean;
    expired?: boolean;
  };
  requestCache: {
    enabled: boolean;
    database: string;
    ttl: number;
  };
  customConfiguration: { filepath: string; load: boolean; save: boolean };
  theme: { darkMode: boolean };
  ui: { liveReload: boolean };
  [key: string]: any;
}

const rawModule = fs.existsSync('./appsettings')
  ? require('./appsettings')
  : require('../appsettings');
const settingsModule: { settings: Settings } = rawModule.settings ? rawModule : rawModule.default;
let { settings } = settingsModule;
const defaultSettings: Settings = JSON.parse(JSON.stringify(settings));
const defaultCustomConfiguration = settings.customConfiguration;
export { settings };
export let customSettingsLoaded = false;
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

const userDataPath = path.join(__dirname, '..', '..', 'data');

export function getUserDataPath(): string {
  return userDataPath;
}

function getCustomConfiguration(): { filepath: string; load: boolean; save: boolean } {
  return settings.customConfiguration ?? defaultCustomConfiguration;
}

function getConfigFile(): string {
  const { filepath } = getCustomConfiguration();
  return path.join(getUserDataPath(), filepath);
}

export function mergeDefaults(partial: Partial<Settings>): Settings {
  function merge(target: any, source: any, path: string[] = []): void {
    for (const key of Object.keys(source)) {
      const src = (source as any)[key];
      if (src === undefined) continue;
      const tgt = target[key];
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        if (tgt !== undefined && typeof tgt !== 'object') {
          throw new TypeError(`Invalid type at ${[...path, key].join('.')}`);
        }
        if (tgt === undefined) target[key] = {};
        merge(target[key], src, [...path, key]);
      } else {
        if (tgt !== undefined && typeof src !== typeof tgt) {
          throw new TypeError(`Invalid type at ${[...path, key].join('.')}`);
        }
        target[key] = src;
      }
    }
  }

  const clone = JSON.parse(JSON.stringify(defaultSettings));
  merge(clone, partial);
  return clone as Settings;
}

export const validateSettings = mergeDefaults;

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
      const parsed = JSON.parse(raw) as Partial<Settings>;
      try {
        settings = mergeDefaults(parsed);
        debug(`Reloaded custom configuration at ${cfg}`);
        if (typeof window !== 'undefined' && settings.ui?.liveReload) {
          window.dispatchEvent(new Event('settings-reloaded'));
        }
      } catch (mergeError) {
        settings = JSON.parse(JSON.stringify(defaultSettings));
        debug(`Failed to merge configuration with error: ${mergeError}`);
        if (typeof window !== 'undefined' && settings.ui?.liveReload) {
          window.dispatchEvent(new Event('settings-reloaded'));
        }
      }
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

  await fs.promises.mkdir(getUserDataPath(), { recursive: true });

  if (configuration && configuration.load) {
    try {
      const filePath = path.join(getUserDataPath(), configuration.filepath);
      const raw = await fs.promises.readFile(filePath, 'utf8');
      try {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        try {
          settings = mergeDefaults(parsed);
          customSettingsLoaded = true;
          debug(`Loaded custom configuration at ${filePath}`);
        } catch (mergeError) {
          settings = JSON.parse(JSON.stringify(defaultSettings));
          customSettingsLoaded = false;
          debug(`Failed to merge custom configuration with error: ${mergeError}`);
        }
      } catch (parseError) {
        customSettingsLoaded = false;
        debug(`Failed to parse custom configuration with error: ${parseError}`);
      }
    } catch (e) {
      debug(`Failed to load custom configuration with error: ${e}`);
      customSettingsLoaded = false;
      // Silently ignore loading errors
    }
  }

  watchConfig();
  if (!customSettingsLoaded) customSettingsLoaded = false;
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
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
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

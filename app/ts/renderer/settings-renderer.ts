import type * as fs from 'fs';
import type { WatchOptions } from '../utils/fileWatcher.js';

const electron = (window as any).electron as {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  readFile: (p: string, opts?: BufferEncoding | fs.ReadFileOptions) => Promise<string>;
  watch: (
    p: string,
    opts: WatchOptions,
    cb: (event: string) => void
  ) => Promise<{ close: () => void }>;
  exists: (p: string) => Promise<boolean>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  path: { join: (...args: string[]) => string };
};
import { debugFactory } from '../common/logger.js';
import appDefaults from '../appsettings.js';
import {
  settings,
  customSettingsLoaded,
  getSettings,
  mergeDefaults,
  validateSettings,
  setSettings,
  type Settings
} from '../common/settings-base.js';

const debug = debugFactory('renderer.settings');
debug('loaded');
const defaultSettings: Settings = JSON.parse(JSON.stringify(appDefaults.settings as Settings));
const defaultCustomConfiguration = settings.customConfiguration;
let userDataPath = (electron as any)?.remote?.app?.getPath('userData') ?? '';

export function getUserDataPath(): string {
  return userDataPath;
}

export async function loadSettings(): Promise<Settings> {
  const { settings: loaded, userDataPath: path } = (await electron.invoke('settings:load')) as {
    settings: Settings;
    userDataPath: string;
  };
  setSettings(loaded);
  userDataPath = path;
  electron.on('settings:reloaded', (_e: any, newSettings: Settings) => {
    setSettings(newSettings);
    window.dispatchEvent(new Event('settings-reloaded'));
  });
  return loaded;
}

export async function saveSettings(newSettings: Settings): Promise<string | Error | undefined> {
  const res = (await electron.invoke('settings:save', newSettings)) as string | Error | undefined;
  if (res === 'SAVED') {
    setSettings(newSettings);
  }
  return res;
}
export {
  settings,
  customSettingsLoaded,
  getSettings,
  mergeDefaults,
  validateSettings,
  setSettings,
  type Settings
};

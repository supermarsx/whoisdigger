import { settingsLoad as tauriSettingsLoad, settingsSave as tauriSettingsSave, listen } from '../common/tauriBridge.js';
import { debugFactory } from '../common/logger.js';
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
const defaultSettings: Settings = JSON.parse(JSON.stringify(settings));
const defaultCustomConfiguration = settings.customConfiguration;
let userDataPath = '';

export function getUserDataPath(): string {
  return userDataPath;
}

export async function loadSettings(): Promise<Settings> {
  const { settings: loaded, userDataPath: path } = (await tauriSettingsLoad()) as {
    settings: Settings;
    userDataPath: string;
  };
  setSettings(loaded);
  userDataPath = path;
  void listen<Settings>('settings:reloaded', (newSettings) => {
    setSettings(newSettings);
    window.dispatchEvent(new Event('settings-reloaded'));
  });
  return loaded;
}

export async function saveSettings(newSettings: Settings): Promise<string | Error | undefined> {
  const res = (await tauriSettingsSave(newSettings)) as string | Error | undefined;
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

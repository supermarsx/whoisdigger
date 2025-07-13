import * as fs from 'fs';
import * as path from 'path';
import { dirnameCompat } from '@utils/dirnameCompat.js';
import { debugFactory } from './logger.js';
import {
  settings,
  defaultSettings,
  defaultCustomConfiguration,
  customSettingsLoaded,
  getSettings,
  setSettings,
  setCustomSettingsLoaded,
  mergeDefaults,
  validateSettings,
  type Settings
} from './settings-base.js';

const debug = debugFactory('common.settings');

const baseDir = dirnameCompat();

const userDataPath = path.join(baseDir, '..', '..', 'data');

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
          setSettings(mergeDefaults(parsed));
          if (settings.appWindowWebPreferences) {
            settings.appWindowWebPreferences.contextIsolation = true;
          }
          setCustomSettingsLoaded(true);
          debug(`Loaded custom configuration at ${filePath}`);
        } catch (mergeError) {
          setSettings(JSON.parse(JSON.stringify(defaultSettings)));
          if (settings.appWindowWebPreferences) {
            settings.appWindowWebPreferences.contextIsolation = true;
          }
          setCustomSettingsLoaded(false);
          debug(`Failed to merge custom configuration with error: ${mergeError}`);
        }
      } catch (parseError) {
        setCustomSettingsLoaded(false);
        debug(`Failed to parse custom configuration with error: ${parseError}`);
      }
    } catch (e) {
      debug(`Failed to load custom configuration with error: ${e}`);
      setCustomSettingsLoaded(false);
      if (settings.appWindowWebPreferences) {
        settings.appWindowWebPreferences.contextIsolation = true;
      }
      // Silently ignore loading errors
    }
  }

  if (!customSettingsLoaded) setCustomSettingsLoaded(false);
  if (settings.appWindowWebPreferences) {
    // Enforce context isolation regardless of loaded configuration
    settings.appWindowWebPreferences.contextIsolation = true;
  }
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
      setSettings(newSettings);
      return 'SAVED';
    } catch (e) {
      debug(`Failed to save custom configuration with error: ${e}`);
      return e as Error;
    }
  }
  setSettings(newSettings);
}

export const loadSettings = load;
export const saveSettings = save;

export {
  settings,
  defaultSettings,
  defaultCustomConfiguration,
  customSettingsLoaded,
  getSettings,
  setSettings,
  setCustomSettingsLoaded,
  mergeDefaults,
  validateSettings
};
export default settings;
export type { Settings } from './settings-base.js';

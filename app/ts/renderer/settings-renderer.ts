import fs from 'fs';
import path from 'path';
import { debugFactory } from '../common/logger.js';
import appDefaults from '../appsettings.js';
import {
  settings,
  customSettingsLoaded,
  getUserDataPath,
  getSettings,
  mergeDefaults,
  validateSettings,
  setSettings,
  load as baseLoad,
  save as baseSave,
  type Settings
} from '../common/settings.js';

const debug = debugFactory('renderer.settings');
const defaultSettings: Settings = JSON.parse(JSON.stringify(appDefaults.settings as Settings));
const defaultCustomConfiguration = settings.customConfiguration;
let watcher: fs.FSWatcher | undefined;

function getCustomConfiguration() {
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
      const parsed = JSON.parse(raw) as Partial<Settings>;
      try {
        const merged = mergeDefaults(parsed);
        if ((merged as any).appWindowWebPreferences) {
          (merged as any).appWindowWebPreferences.contextIsolation = true;
        }
        setSettings(merged);
        debug(`Reloaded custom configuration at ${cfg}`);
        if (typeof window !== 'undefined' && settings.ui?.liveReload) {
          window.dispatchEvent(new Event('settings-reloaded'));
        }
      } catch (mergeError) {
        const defaults = JSON.parse(JSON.stringify(defaultSettings));
        if ((defaults as any).appWindowWebPreferences) {
          (defaults as any).appWindowWebPreferences.contextIsolation = true;
        }
        setSettings(defaults);
        debug(`Failed to merge configuration with error: ${mergeError}`);
        if (typeof window !== 'undefined' && settings.ui?.liveReload) {
          window.dispatchEvent(new Event('settings-reloaded'));
        }
      }
    } catch (e) {
      debug(`Failed to reload configuration with error: ${e}`);
    }
  });
}

export async function loadSettings(): Promise<Settings> {
  const result = await baseLoad();
  watchConfig();
  return result;
}

export const saveSettings = baseSave;
export {
  settings,
  customSettingsLoaded,
  getUserDataPath,
  getSettings,
  mergeDefaults,
  validateSettings,
  setSettings,
  type Settings
};

import fs from 'fs';
import path from 'path';
import { ipcMain, BrowserWindow } from 'electron';
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

const debug = debugFactory('main.settings');
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
  const dir = path.dirname(cfg);

  async function reload(): Promise<void> {
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
      } catch (mergeError) {
        const defaults = JSON.parse(JSON.stringify(defaultSettings));
        if ((defaults as any).appWindowWebPreferences) {
          (defaults as any).appWindowWebPreferences.contextIsolation = true;
        }
        setSettings(defaults);
        debug(`Failed to merge configuration with error: ${mergeError}`);
      }
      if (settings.ui?.liveReload) {
        for (const w of BrowserWindow.getAllWindows()) {
          w.webContents.send('settings:reloaded', getSettings());
        }
      }
    } catch (e) {
      debug(`Failed to reload configuration with error: ${e}`);
    }
  }

  watcher = fs.watch(dir, { persistent: false }, (_event, filename) => {
    if (!filename) return;
    if (path.join(dir, filename.toString()) !== cfg) return;
    if (!fs.existsSync(cfg)) return;
    void reload();
  });
}

export async function loadSettings(): Promise<Settings> {
  const result = await baseLoad();
  watchConfig();
  return result;
}

export const saveSettings = baseSave;

if (ipcMain && typeof ipcMain.handle === 'function') {
  ipcMain.handle('settings:load', async () => {
    const loaded = await loadSettings();
    return { settings: loaded, userDataPath: getUserDataPath() };
  });

  ipcMain.handle('settings:save', async (_e, newSettings: Settings) => {
    const res = await saveSettings(newSettings);
    if (res === 'SAVED' && settings.ui?.liveReload) {
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('settings:reloaded', getSettings());
      }
    }
    return res;
  });
}
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

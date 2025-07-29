export interface AppWindowSettings {
  frame: boolean;
  show: boolean;
  height: number;
  width: number;
  icon: string;
  center: boolean;
  minimizable: boolean;
  maximizable: boolean;
  movable: boolean;
  resizable: boolean;
  closable: boolean;
  focusable: boolean;
  alwaysOnTop: boolean;
  fullscreen: boolean;
  fullscreenable: boolean;
  kiosk: boolean;
  darkTheme: boolean;
  thickFrame: boolean;
}

export interface WebPreferencesSettings {
  nodeIntegration: boolean;
  contextIsolation: boolean;
  zoomFactor: number;
  images: boolean;
  experimentalFeatures: boolean;
  backgroundThrottling: boolean;
  offscreen: boolean;
  spellcheck: boolean;
  enableRemoteModule: boolean;
}

export interface AppUrlSettings {
  pathname: string;
  protocol: string;
  slashes: boolean;
}

export interface StartupSettings {
  developerTools: boolean;
}

export interface NavigationSettings {
  developerTools: boolean;
  extendedCollapsed: boolean;
  enableExtendedMenu: boolean;
}

export interface Settings {
  appWindow: AppWindowSettings;
  appWindowWebPreferences: WebPreferencesSettings;
  appWindowUrl: AppUrlSettings;
  appWindowNavigation: NavigationSettings;
  startup: StartupSettings;
  lookupConversion: { enabled: boolean; algorithm: string };
  lookupGeneral: {
    type: 'dns' | 'whois' | 'rdap';
    psl: boolean;
    server: string;
    verbose: boolean;
    follow: number;
    timeout: number;
    timeBetween: number;
    dnsTimeBetweenOverride: boolean;
    dnsTimeBetween: number;
  };
  lookupRandomizeFollow: { randomize: boolean; minimumDepth: number; maximumDepth: number };
  lookupRandomizeTimeout: { randomize: boolean; minimum: number; maximum: number };
  lookupRandomizeTimeBetween: { randomize: boolean; minimum: number; maximum: number };
  lookupProxy: {
    enable: boolean;
    mode: 'single' | 'multi';
    multimode: 'sequential' | 'random' | 'ascending' | 'descending';
    check: boolean;
    checktype: 'ping' | 'request' | 'ping+request';
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
  theme: { darkMode: boolean; followSystem: boolean };
  ui: { liveReload: boolean; confirmExit: boolean; language: string };
  ai: {
    enabled: boolean;
    modelPath: string;
    dataPath: string;
    modelURL: string;
    openai: { url: string; apiKey: string };
  };
  [key: string]: any;
}

import { debugFactory } from './logger.js';
import appDefaults from '../appsettings.js';

export const settings: Settings = appDefaults.settings as Settings;
export const defaultSettings: Settings = JSON.parse(JSON.stringify(settings));
export const defaultCustomConfiguration = settings.customConfiguration;

export let customSettingsLoaded = false;
export function setCustomSettingsLoaded(value: boolean): void {
  customSettingsLoaded = value;
}
const debug = debugFactory('settings.base');

export function getSettings(): Settings {
  return settings;
}

export function setSettings(newSettings: Settings): void {
  Object.assign(settings, newSettings);
}

export function mergeDefaults(partial: Partial<Settings>): Settings {
  function merge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>,
    path: string[] = []
  ): void {
    for (const key of Object.keys(source as Record<string, unknown>)) {
      const k = key as keyof T;
      const src = source[k];
      if (src === undefined) continue;
      const tgt = target[k];
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        if (tgt !== undefined && typeof tgt !== 'object') {
          throw new TypeError(`Invalid type at ${[...path, String(key)].join('.')}`);
        }
        if (tgt === undefined) {
          (target as Record<string, unknown>)[key] = {};
        }
        merge(
          (target as Record<string, unknown>)[key] as unknown as Record<string, unknown>,
          src as Partial<Record<string, unknown>>,
          [...path, String(key)]
        );
      } else {
        if (tgt !== undefined && typeof src !== typeof tgt) {
          throw new TypeError(`Invalid type at ${[...path, String(key)].join('.')}`);
        }
        (target as Record<string, unknown>)[key] = src as unknown;
      }
    }
  }

  const clone = JSON.parse(JSON.stringify(defaultSettings));
  merge(clone, partial);
  return clone as Settings;
}

export const validateSettings = mergeDefaults;

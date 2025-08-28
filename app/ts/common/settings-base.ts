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

export interface ProxyEntry {
  proxy: string;
  username?: string;
  password?: string;
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
  lookupRdap: { endpoints: string[] };
  lookupRandomizeFollow: { randomize: boolean; minimumDepth: number; maximumDepth: number };
  lookupRandomizeTimeout: { randomize: boolean; minimum: number; maximum: number };
  lookupRandomizeTimeBetween: { randomize: boolean; minimum: number; maximum: number };
  lookupProxy: {
    enable: boolean;
    mode: 'single' | 'multi';
    multimode: 'sequential' | 'random' | 'ascending' | 'descending';
    check: boolean;
    checktype: 'ping' | 'request' | 'ping+request';
    single?: string | ProxyEntry;
    list?: (string | ProxyEntry)[];
    username?: string;
    password?: string;
    retries: number;
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
    purgeInterval: number;
    maxEntries: number;
  };
  customConfiguration: { filepath: string; load: boolean; save: boolean };
  theme: { darkMode: boolean; followSystem: boolean };
  ui: { liveReload: boolean; confirmExit: boolean; language?: string };
  ai: {
    enabled: boolean;
    modelPath: string;
    dataPath: string;
    modelURL: string;
    openai: { url: string; apiKey: string };
  };
  monitor: { list: string[]; interval: number };
  [key: string]: any;
}

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { z } = require('zod') as typeof import('zod');
import { debugFactory } from './logger.js';
import appDefaults from '../appsettings.js';

const ProxyEntrySchema = z.object({
  proxy: z.string(),
  username: z.string().optional(),
  password: z.string().optional()
});

export const SettingsSchema = z
  .object({
    appWindow: z.object({
      frame: z.boolean(),
      show: z.boolean(),
      height: z.number(),
      width: z.number(),
      icon: z.string(),
      center: z.boolean(),
      minimizable: z.boolean(),
      maximizable: z.boolean(),
      movable: z.boolean(),
      resizable: z.boolean(),
      closable: z.boolean(),
      focusable: z.boolean(),
      alwaysOnTop: z.boolean(),
      fullscreen: z.boolean(),
      fullscreenable: z.boolean(),
      kiosk: z.boolean(),
      darkTheme: z.boolean(),
      thickFrame: z.boolean()
    }),
    appWindowWebPreferences: z.object({
      nodeIntegration: z.boolean(),
      contextIsolation: z.boolean(),
      zoomFactor: z.number(),
      images: z.boolean(),
      experimentalFeatures: z.boolean(),
      backgroundThrottling: z.boolean(),
      offscreen: z.boolean(),
      spellcheck: z.boolean()
    }),
    appWindowUrl: z.object({
      pathname: z.string(),
      protocol: z.string(),
      slashes: z.boolean()
    }),
    appWindowNavigation: z.object({
      developerTools: z.boolean(),
      extendedCollapsed: z.boolean(),
      enableExtendedMenu: z.boolean()
    }),
    startup: z.object({
      developerTools: z.boolean()
    }),
    lookupConversion: z.object({
      enabled: z.boolean(),
      algorithm: z.string()
    }),
    lookupGeneral: z.object({
      type: z.enum(['dns', 'whois', 'rdap']),
      psl: z.boolean(),
      server: z.string(),
      verbose: z.boolean(),
      follow: z.number(),
      timeout: z.number(),
      timeBetween: z.number(),
      dnsTimeBetweenOverride: z.boolean(),
      dnsTimeBetween: z.number()
    }),
    lookupRdap: z
      .object({ endpoints: z.array(z.string()) })
      .default({ endpoints: ['https://rdap.org/domain/'] }),
    lookupRandomizeFollow: z.object({
      randomize: z.boolean(),
      minimumDepth: z.number(),
      maximumDepth: z.number()
    }),
    lookupRandomizeTimeout: z.object({
      randomize: z.boolean(),
      minimum: z.number(),
      maximum: z.number()
    }),
    lookupRandomizeTimeBetween: z.object({
      randomize: z.boolean(),
      minimum: z.number(),
      maximum: z.number()
    }),
    lookupProxy: z.object({
      enable: z.boolean(),
      mode: z.enum(['single', 'multi']),
      multimode: z.enum(['sequential', 'random', 'ascending', 'descending']),
      check: z.boolean(),
      checktype: z.enum(['ping', 'request', 'ping+request']),
      single: z.union([z.string(), ProxyEntrySchema]).optional(),
      list: z.array(z.union([z.string(), ProxyEntrySchema])).optional(),
      retries: z.number()
    }),
    lookupAssumptions: z.object({
      uniregistry: z.boolean(),
      ratelimit: z.boolean(),
      unparsable: z.boolean(),
      dnsFailureUnavailable: z.boolean(),
      expired: z.boolean().optional()
    }),
    requestCache: z.object({
      enabled: z.boolean(),
      database: z.string(),
      ttl: z.number(),
      purgeInterval: z.number(),
      maxEntries: z.number()
    }),
    customConfiguration: z.object({
      filepath: z.string(),
      load: z.boolean(),
      save: z.boolean()
    }),
    theme: z.object({
      darkMode: z.boolean(),
      followSystem: z.boolean()
    }),
    ui: z.object({
      liveReload: z.boolean(),
      confirmExit: z.boolean(),
      language: z.string().optional()
    }),
    ai: z.object({
      enabled: z.boolean(),
      modelPath: z.string(),
      dataPath: z.string(),
      modelURL: z.string(),
      openai: z.object({ url: z.string(), apiKey: z.string() })
    }),
    monitor: z.object({
      list: z.array(z.string()),
      interval: z.number()
    })
  })
  .catchall(z.any());

export const settings: Settings = SettingsSchema.parse(appDefaults.settings) as Settings;
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

export function validateSettings(partial: Partial<Settings>): Settings {
  function merge(target: any, source: any): void {
    for (const key of Object.keys(source ?? {})) {
      const src = source[key];
      if (src === undefined) continue;
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        if (typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = {};
        }
        merge(target[key], src);
      } else {
        target[key] = src;
      }
    }
  }

  const clone: Settings = JSON.parse(JSON.stringify(defaultSettings));
  merge(clone, partial);
  return SettingsSchema.parse(clone) as Settings;
}

export const mergeDefaults = validateSettings;

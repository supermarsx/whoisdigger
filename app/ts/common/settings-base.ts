export interface Settings {
  lookupConversion: { enabled: boolean; algorithm: string };
  lookupGeneral: {
    type: 'dns' | 'whois';
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

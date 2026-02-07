/**
 * Tests for app/ts/common/settings-base.ts — Settings validation, merging, Zod schema
 */
jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {}
}));

import {
  settings,
  defaultSettings,
  SettingsSchema,
  validateSettings,
  mergeDefaults,
  getSettings,
  setSettings,
  customSettingsLoaded,
  setCustomSettingsLoaded
} from '../app/ts/common/settings-base.js';

describe('SettingsSchema (Zod)', () => {
  test('settings object passes Zod validation', () => {
    expect(() => SettingsSchema.parse(settings)).not.toThrow();
  });

  test('rejects completely invalid input', () => {
    expect(() => SettingsSchema.parse('not an object')).toThrow();
    expect(() => SettingsSchema.parse(42)).toThrow();
    expect(() => SettingsSchema.parse(null)).toThrow();
  });

  test('rejects object with wrong field types', () => {
    expect(() =>
      SettingsSchema.parse({ ...settings, appWindow: 'not an object' })
    ).toThrow();
  });

  test('rejects invalid lookupGeneral.type enum value', () => {
    const bad = JSON.parse(JSON.stringify(settings));
    bad.lookupGeneral.type = 'invalid';
    expect(() => SettingsSchema.parse(bad)).toThrow();
  });

  test('accepts valid lookupGeneral.type enum values', () => {
    for (const t of ['dns', 'whois', 'rdap']) {
      const valid = JSON.parse(JSON.stringify(settings));
      valid.lookupGeneral.type = t;
      expect(() => SettingsSchema.parse(valid)).not.toThrow();
    }
  });

  test('rejects invalid proxy mode', () => {
    const bad = JSON.parse(JSON.stringify(settings));
    bad.lookupProxy.mode = 'invalid';
    expect(() => SettingsSchema.parse(bad)).toThrow();
  });

  test('accepts valid proxy multimode values', () => {
    for (const m of ['sequential', 'random', 'ascending', 'descending']) {
      const valid = JSON.parse(JSON.stringify(settings));
      valid.lookupProxy.multimode = m;
      expect(() => SettingsSchema.parse(valid)).not.toThrow();
    }
  });
});

describe('defaultSettings', () => {
  test('is a deep copy (not same reference)', () => {
    expect(defaultSettings).not.toBe(settings);
    expect(defaultSettings).toEqual(settings);
  });

  test('has expected default values', () => {
    expect(defaultSettings.appWindow.height).toBe(700);
    expect(defaultSettings.appWindow.width).toBe(1000);
    expect(defaultSettings.appWindow.frame).toBe(false);
    expect(defaultSettings.appWindowWebPreferences.nodeIntegration).toBe(false);
    expect(defaultSettings.appWindowWebPreferences.contextIsolation).toBe(true);
    expect(defaultSettings.lookupGeneral.type).toBe('whois');
    expect(defaultSettings.lookupGeneral.timeout).toBeGreaterThan(0);
    expect(defaultSettings.ai.enabled).toBe(false);
    expect(defaultSettings.theme.darkMode).toBe(false);
  });
});

describe('validateSettings / mergeDefaults', () => {
  test('mergeDefaults is the same function as validateSettings', () => {
    expect(mergeDefaults).toBe(validateSettings);
  });

  test('returns full settings when given empty partial', () => {
    const result = validateSettings({});
    expect(result.appWindow.height).toBe(defaultSettings.appWindow.height);
    expect(result.lookupGeneral.type).toBe(defaultSettings.lookupGeneral.type);
  });

  test('overrides specific fields while keeping defaults', () => {
    const result = validateSettings({
      appWindow: { height: 900 } as any
    });
    expect(result.appWindow.height).toBe(900);
    expect(result.appWindow.width).toBe(defaultSettings.appWindow.width);
  });

  test('deeply merges nested objects', () => {
    const result = validateSettings({
      lookupProxy: { enable: true } as any
    });
    expect(result.lookupProxy.enable).toBe(true);
    expect(result.lookupProxy.mode).toBe(defaultSettings.lookupProxy.mode);
  });

  test('does not mutate the default settings', () => {
    const originalHeight = defaultSettings.appWindow.height;
    validateSettings({ appWindow: { height: 999 } as any });
    expect(defaultSettings.appWindow.height).toBe(originalHeight);
  });

  test('handles undefined values in partial', () => {
    const result = validateSettings({
      appWindow: { height: undefined } as any
    });
    // undefined should be ignored, keeping default
    expect(result.appWindow.height).toBe(defaultSettings.appWindow.height);
  });

  test('replaces arrays entirely', () => {
    const result = validateSettings({
      monitor: { list: ['example.com'], interval: 30 }
    });
    expect(result.monitor.list).toEqual(['example.com']);
  });
});

describe('getSettings / setSettings', () => {
  test('getSettings returns the current settings object', () => {
    expect(getSettings()).toBe(settings);
  });

  test('setSettings updates the settings object', () => {
    const originalTimeout = settings.lookupGeneral.timeout;
    const modified = { ...settings, lookupGeneral: { ...settings.lookupGeneral, timeout: 99999 } };
    setSettings(modified);
    expect(settings.lookupGeneral.timeout).toBe(99999);
    // Restore
    setSettings({ ...settings, lookupGeneral: { ...settings.lookupGeneral, timeout: originalTimeout } });
  });
});

describe('customSettingsLoaded', () => {
  test('setCustomSettingsLoaded updates the exported value', () => {
    // With babel/CJS transforms, `let` exports are live bindings in the module namespace.
    // After calling the setter, the imported binding should reflect the new value.
    setCustomSettingsLoaded(false);
    const mod = require('../app/ts/common/settings-base.js');
    expect(mod.customSettingsLoaded).toBe(false);
    setCustomSettingsLoaded(true);
    expect(mod.customSettingsLoaded).toBe(true);
    // Restore
    setCustomSettingsLoaded(false);
  });
});

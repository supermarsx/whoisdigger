/**
 * @jest-environment jsdom
 */
/**
 * Exhaustiveness test — verifies that every public export from tauriBridge.ts
 * is accounted for. This prevents regressions where new functions are added
 * but not tested, or old functions are accidentally removed.
 */

// ── Tauri global mock ──────────────────────────────────────────────────────

(window as any).__TAURI__ = {
  core: { invoke: jest.fn().mockResolvedValue(undefined) },
  event: { listen: jest.fn().mockResolvedValue(jest.fn()) },
  dialog: { save: jest.fn(), open: jest.fn() },
  window: {
    getCurrentWindow: () => ({
      minimize: jest.fn(),
      toggleMaximize: jest.fn(),
      close: jest.fn(),
    }),
  },
};

import * as bridge from '../app/ts/common/tauriBridge';

// ─── Exhaustiveness Check ───────────────────────────────────────────────────

describe('tauriBridge export exhaustiveness', () => {
  /**
   * Every public export from tauriBridge.ts must appear here.
   * If a new export is added without updating this list, the test will fail.
   * If an export is removed, this test will also fail.
   */
  const expectedExports = [
    // WHOIS
    'whoisLookup',
    'whoisLookupWithSettings',
    'whoisParse',
    'dnsLookup',
    'rdapLookup',
    'availabilityCheck',
    'availabilityCheckWithSettings',
    'domainParameters',

    // Bulk WHOIS
    'bulkWhoisLookup',
    'bulkWhoisPause',
    'bulkWhoisContinue',
    'bulkWhoisStop',
    'bulkWhoisExport',
    'bulkEstimateTime',

    // BWA
    'bwaAnalyserStart',

    // Text / CSV
    'toProcess',
    'parseCsv',
    'wordlistTransform',

    // Dialogs
    'openFileDialog',
    'saveFileDialog',
    'openTextFileDialog',
    'openCsvJsonDialog',
    'openDbFileDialog',

    // Settings
    'settingsLoad',
    'settingsSave',
    'configDelete',
    'configExport',
    'configImport',

    // Profiles
    'profilesList',
    'profilesCreate',
    'profilesRename',
    'profilesDelete',
    'profilesSetCurrent',
    'profilesGetCurrent',
    'profilesExport',
    'profilesImport',

    // History
    'historyGet',
    'historyClear',
    'historyMerge',

    // Cache
    'cacheGet',
    'cacheSet',
    'cacheClear',
    'cacheMerge',

    // Stats
    'statsStart',
    'statsRefresh',
    'statsStop',
    'statsGet',

    // Monitor
    'monitorStart',
    'monitorStop',
    'monitorLookup',

    // I18n
    'i18nLoad',

    // AI
    'aiSuggest',
    'aiSuggestWithSettings',
    'aiPredict',
    'aiDownloadModel',

    // Lookup / Proxy settings
    'lookupGetSettings',
    'lookupSetSettings',
    'proxyGetSettings',
    'proxySetSettings',

    // Namespaces
    'fs',
    'path',
    'app',

    // Utility
    'fileInfo',
    'convertFileSize',
    'convertDuration',

    // Events
    'listen',
    'unlisten',

    // Watch stub
    'watch',
  ] as const;

  test('all expected exports exist on the module', () => {
    for (const name of expectedExports) {
      expect(bridge).toHaveProperty(name);
    }
  });

  test('module has no unexpected exports', () => {
    const actualExports = Object.keys(bridge).sort();
    const expected = [...expectedExports].sort();
    expect(actualExports).toEqual(expected);
  });

  test('function exports are callable', () => {
    const nonNamespaceExports = expectedExports.filter(
      (n) => !['fs', 'path', 'app'].includes(n)
    );
    for (const name of nonNamespaceExports) {
      expect(typeof (bridge as any)[name]).toBe('function');
    }
  });

  test('namespace exports are objects', () => {
    for (const ns of ['fs', 'path', 'app'] as const) {
      expect(typeof (bridge as any)[ns]).toBe('object');
    }
  });
});

// ─── fs Namespace Exhaustiveness ────────────────────────────────────────────

describe('fs namespace exhaustiveness', () => {
  const expectedFsMethods = [
    'readFile',
    'writeFile',
    'exists',
    'stat',
    'readdir',
    'unlink',
    'access',
    'mkdir',
  ];

  test('all fs methods exist', () => {
    for (const method of expectedFsMethods) {
      expect(bridge.fs).toHaveProperty(method);
      expect(typeof (bridge.fs as any)[method]).toBe('function');
    }
  });

  test('fs has no unexpected methods', () => {
    const actual = Object.keys(bridge.fs).sort();
    expect(actual).toEqual([...expectedFsMethods].sort());
  });
});

// ─── path Namespace Exhaustiveness ──────────────────────────────────────────

describe('path namespace exhaustiveness', () => {
  const expectedPathMethods = ['join', 'basename'];

  test('all path methods exist', () => {
    for (const method of expectedPathMethods) {
      expect(bridge.path).toHaveProperty(method);
      expect(typeof (bridge.path as any)[method]).toBe('function');
    }
  });

  test('path has no unexpected methods', () => {
    const actual = Object.keys(bridge.path).sort();
    expect(actual).toEqual([...expectedPathMethods].sort());
  });
});

// ─── app Namespace Exhaustiveness ───────────────────────────────────────────

describe('app namespace exhaustiveness', () => {
  const expectedAppMethods = [
    'getBaseDir',
    'getUserDataPath',
    'openDataDir',
    'openPath',
    'minimize',
    'toggleMaximize',
    'close',
    'reload',
    'toggleDevtools',
  ];

  test('all app methods exist', () => {
    for (const method of expectedAppMethods) {
      expect(bridge.app).toHaveProperty(method);
      expect(typeof (bridge.app as any)[method]).toBe('function');
    }
  });

  test('app has no unexpected methods', () => {
    const actual = Object.keys(bridge.app).sort();
    expect(actual).toEqual([...expectedAppMethods].sort());
  });
});

// ─── Type Re-Export Check ───────────────────────────────────────────────────

describe('Type re-exports', () => {
  test('ProfileEntry interface is usable as a type', () => {
    // This test verifies the ProfileEntry type is accessible at runtime
    // through the profilesList return type. The interface itself isn't
    // a runtime export but should be importable by consumers.
    const mockProfile: bridge.ProfileEntry = {
      id: 'test',
      name: 'Test',
      file: 'test.json',
    };
    expect(mockProfile.id).toBe('test');
  });

  test('ProfileEntry optional mtime field', () => {
    const withMtime: bridge.ProfileEntry = {
      id: 'a',
      name: 'A',
      file: 'a.json',
      mtime: 1234567890,
    };
    expect(withMtime.mtime).toBe(1234567890);

    const withoutMtime: bridge.ProfileEntry = {
      id: 'b',
      name: 'B',
      file: 'b.json',
    };
    expect(withoutMtime.mtime).toBeUndefined();
  });
});

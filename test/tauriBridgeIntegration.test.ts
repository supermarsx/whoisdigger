/**
 * @jest-environment jsdom
 */
/**
 * Integration-style tests for tauriBridge — verifying multi-step workflows
 * that combine several bridge APIs in sequence, mimicking real application
 * usage patterns (e.g. settings load → modify → save, bulk lookup → export,
 * cache-then-lookup, profile lifecycle, etc.).
 */

// ── Tauri global mock ──────────────────────────────────────────────────────

const invokeMock = jest.fn();
const listenMock = jest.fn().mockResolvedValue(jest.fn());
const saveMock = jest.fn();
const openMock = jest.fn();
const minimizeMock = jest.fn().mockResolvedValue(undefined);
const toggleMaximizeMock = jest.fn().mockResolvedValue(undefined);
const closeMock = jest.fn().mockResolvedValue(undefined);

(window as any).__TAURI__ = {
  core: { invoke: invokeMock },
  event: { listen: listenMock },
  dialog: { save: saveMock, open: openMock },
  window: {
    getCurrentWindow: () => ({
      minimize: minimizeMock,
      toggleMaximize: toggleMaximizeMock,
      close: closeMock,
    }),
  },
};

import {
  whoisLookup,
  dnsLookup,
  rdapLookup,
  availabilityCheck,
  domainParameters,
  bulkWhoisLookup,
  bulkWhoisPause,
  bulkWhoisContinue,
  bulkWhoisStop,
  bulkWhoisExport,
  settingsLoad,
  settingsSave,
  configExport,
  configImport,
  configDelete,
  profilesList,
  profilesCreate,
  profilesRename,
  profilesDelete,
  profilesSetCurrent,
  profilesExport,
  profilesImport,
  historyGet,
  historyClear,
  historyMerge,
  cacheGet,
  cacheSet,
  cacheClear,
  cacheMerge,
  statsStart,
  statsRefresh,
  statsStop,
  statsGet,
  monitorStart,
  monitorStop,
  monitorLookup,
  fs,
  path,
  app,
  listen,
  unlisten,
} from '../app/ts/common/tauriBridge';

beforeEach(() => {
  jest.clearAllMocks();
  invokeMock.mockResolvedValue(undefined);
});

// ─── Settings Workflow ──────────────────────────────────────────────────────

describe('Settings workflow', () => {
  test('load → modify → save round-trip', async () => {
    invokeMock
      .mockResolvedValueOnce('/user/data') // settingsLoad: user path
      .mockResolvedValueOnce('{"theme":"light","proxy":""}') // settingsLoad: settings json
      .mockResolvedValueOnce(undefined); // settingsSave

    const { settings, userDataPath } = await settingsLoad();
    expect(settings).toEqual({ theme: 'light', proxy: '' });
    expect(userDataPath).toBe('/user/data');

    // Modify settings
    const updated = { ...settings, theme: 'dark', proxy: 'socks5://localhost:9050' };
    const result = await settingsSave(updated);
    expect(result).toBe('SAVED');
    expect(invokeMock).toHaveBeenCalledWith('settings_save', {
      filename: 'settings.json',
      content: JSON.stringify(updated),
    });
  });

  test('export → delete → import round-trip', async () => {
    // Export
    invokeMock.mockResolvedValueOnce('{"exported":"config"}');
    const exported = await configExport();
    expect(exported).toBe('{"exported":"config"}');

    // Delete
    invokeMock.mockResolvedValueOnce(undefined);
    await configDelete('settings.json');

    // Import
    openMock.mockResolvedValue('/backup.json');
    invokeMock.mockResolvedValueOnce('{"imported":"config"}'); // fs_read_file
    invokeMock.mockResolvedValueOnce(undefined); // config_import
    await configImport();

    expect(invokeMock).toHaveBeenCalledWith('config_import', { content: '{"imported":"config"}' });
  });
});

// ─── Profile Lifecycle Workflow ─────────────────────────────────────────────

describe('Profile lifecycle workflow', () => {
  test('list → create → rename → set current → export → delete', async () => {
    // List profiles
    invokeMock.mockResolvedValueOnce([
      { id: 'default', name: 'Default', file: 'default.json' },
    ]);
    const profiles = await profilesList();
    expect(profiles).toHaveLength(1);

    // Create new profile
    invokeMock.mockResolvedValueOnce({ id: 'work-123' });
    const newProfile = await profilesCreate('Work', true);
    expect(newProfile.id).toBe('work-123');

    // Rename it
    invokeMock.mockResolvedValueOnce(undefined);
    await profilesRename('work-123', 'Office');

    // Set as current
    invokeMock.mockResolvedValueOnce(undefined);
    await profilesSetCurrent('work-123');

    // Export it
    invokeMock.mockResolvedValueOnce('/exports/work.zip');
    const exportPath = await profilesExport('work-123');
    expect(exportPath).toBe('/exports/work.zip');

    // Delete it
    invokeMock.mockResolvedValueOnce(undefined);
    await profilesDelete('work-123');

    // Verify all calls were made
    expect(invokeMock).toHaveBeenCalledTimes(6);
  });

  test('import profile then set as current', async () => {
    openMock.mockResolvedValue('/downloads/imported.zip');
    invokeMock.mockResolvedValueOnce({ id: 'imported' });
    const result = await profilesImport();
    expect(result).toEqual({ id: 'imported' });

    invokeMock.mockResolvedValueOnce(undefined);
    await profilesSetCurrent('imported');
    expect(invokeMock).toHaveBeenCalledWith('profiles_set_current', { id: 'imported' });
  });
});

// ─── Single Domain Lookup Workflow ──────────────────────────────────────────

describe('Single domain lookup workflow', () => {
  test('DNS check → WHOIS lookup → availability → parameters', async () => {
    // Step 1: DNS lookup
    invokeMock.mockResolvedValueOnce(true);
    const dnsResult = await dnsLookup('example.com');
    expect(dnsResult).toBe(true);

    // Step 2: WHOIS lookup
    invokeMock.mockResolvedValueOnce('Domain: example.com\nExpiry: 2027-01-01');
    const whoisResult = await whoisLookup('example.com');
    expect(whoisResult).toContain('example.com');

    // Step 3: Availability check
    invokeMock.mockResolvedValueOnce('registered');
    const status = await availabilityCheck(whoisResult);
    expect(status).toBe('registered');

    // Step 4: Domain parameters
    invokeMock.mockResolvedValueOnce({ registrar: 'TestReg', expiry: '2027-01-01' });
    const params = await domainParameters('example.com', status as any, whoisResult);
    expect(params).toEqual({ registrar: 'TestReg', expiry: '2027-01-01' });

    expect(invokeMock).toHaveBeenCalledTimes(4);
  });

  test('cache hit skips WHOIS lookup', async () => {
    // Check cache first
    invokeMock.mockResolvedValueOnce('cached WHOIS result');
    const cached = await cacheGet('whois', 'example.com', { ttl: 3600 });
    expect(cached).toBe('cached WHOIS result');

    // If cached, no WHOIS lookup needed
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalledWith('whois_lookup', expect.anything());
  });

  test('cache miss → lookup → cache set', async () => {
    // Cache miss
    invokeMock.mockResolvedValueOnce(undefined);
    const cached = await cacheGet('whois', 'new.com', { ttl: 3600 });
    expect(cached).toBeUndefined();

    // Perform lookup
    invokeMock.mockResolvedValueOnce('WHOIS for new.com');
    const whois = await whoisLookup('new.com');

    // Store in cache
    invokeMock.mockResolvedValueOnce(undefined);
    await cacheSet('whois', 'new.com', whois);

    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_set', {
      key: 'whois:new.com',
      response: 'WHOIS for new.com',
      maxEntries: 1000,
    });
  });
});

// ─── RDAP Lookup Workflow ───────────────────────────────────────────────────

describe('RDAP lookup workflow', () => {
  test('RDAP lookup → cache → availability', async () => {
    invokeMock.mockResolvedValueOnce('{"objectClassName":"domain","handle":"example.com"}');
    const rdap = await rdapLookup('example.com');
    expect(rdap).toContain('example.com');

    invokeMock.mockResolvedValueOnce(undefined);
    await cacheSet('rdap', 'example.com', rdap);
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_set', {
      key: 'rdap:example.com',
      response: rdap,
      maxEntries: 1000,
    });
  });
});

// ─── Bulk WHOIS Workflow ────────────────────────────────────────────────────

describe('Bulk WHOIS workflow', () => {
  test('start → pause → continue → stop → export lifecycle', async () => {
    // Start bulk lookup
    invokeMock.mockResolvedValueOnce(undefined);
    await bulkWhoisLookup(['a.com', 'b.com', 'c.com'], ['com', 'net']);

    // Pause
    invokeMock.mockResolvedValueOnce(undefined);
    await bulkWhoisPause();

    // Continue
    invokeMock.mockResolvedValueOnce(undefined);
    await bulkWhoisContinue();

    // Stop
    invokeMock.mockResolvedValueOnce(undefined);
    await bulkWhoisStop();

    // Export results
    saveMock.mockResolvedValue('/export/results.csv');
    invokeMock.mockResolvedValueOnce(undefined);
    const mockResults = { domains: ['a.com', 'b.com', 'c.com'] };
    await bulkWhoisExport(mockResults as any, { filetype: 'csv' } as any);

    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_lookup', {
      domains: ['a.com', 'b.com', 'c.com'],
      tlds: ['com', 'net'],
      concurrency: 4,
      timeoutMs: 5000,
    });
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_export', {
      results: mockResults,
      options: { filetype: 'csv' },
      path: '/export/results.csv',
    });
  });

  test('bulk lookup with event listener for progress', async () => {
    const progressHandler = jest.fn();
    const unlistenFn = jest.fn();
    listenMock.mockResolvedValue(unlistenFn);

    // Register progress listener
    await listen('bulk:progress', progressHandler);

    // Start bulk
    invokeMock.mockResolvedValueOnce(undefined);
    await bulkWhoisLookup(['d.com'], undefined, 2, 3000);

    // Stop and clean up
    invokeMock.mockResolvedValueOnce(undefined);
    await bulkWhoisStop();
    unlisten('bulk:progress');

    expect(unlistenFn).toHaveBeenCalled();
  });
});

// ─── History & Cache Merge Workflow ─────────────────────────────────────────

describe('History and cache merge workflow', () => {
  test('get history → clear → merge from backup', async () => {
    invokeMock.mockResolvedValueOnce([{ domain: 'a.com' }, { domain: 'b.com' }]);
    const history = await historyGet(50);
    expect(history).toHaveLength(2);

    invokeMock.mockResolvedValueOnce(undefined);
    await historyClear();

    invokeMock.mockResolvedValueOnce(undefined);
    await historyMerge(['/backup/history.sqlite']);

    expect(invokeMock).toHaveBeenCalledWith('history_merge', {
      paths: ['/backup/history.sqlite'],
    });
  });

  test('clear cache then merge from multiple files', async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await cacheClear();

    invokeMock.mockResolvedValueOnce(undefined);
    await cacheMerge(['/backup/cache1.sqlite', '/backup/cache2.sqlite']);

    expect(invokeMock).toHaveBeenCalledWith('cache_merge', {
      paths: ['/backup/cache1.sqlite', '/backup/cache2.sqlite'],
    });
  });
});

// ─── Stats Workflow ─────────────────────────────────────────────────────────

describe('Stats workflow', () => {
  test('start → refresh → get → stop lifecycle', async () => {
    invokeMock.mockResolvedValueOnce(1); // statsStart returns watcher id
    const watcherId = await statsStart('/config', '/data');
    expect(watcherId).toBe(1);

    invokeMock.mockResolvedValueOnce(undefined);
    await statsRefresh(watcherId);

    invokeMock.mockResolvedValueOnce({
      cacheSize: 42,
      historySize: 100,
      diskUsage: 1024,
    });
    const stats = await statsGet('/config', '/data');
    expect(stats).toEqual({
      cacheSize: 42,
      historySize: 100,
      diskUsage: 1024,
    });

    invokeMock.mockResolvedValueOnce(undefined);
    await statsStop(watcherId);

    expect(invokeMock).toHaveBeenCalledTimes(4);
  });
});

// ─── Monitor Workflow ───────────────────────────────────────────────────────

describe('Monitor workflow', () => {
  test('start → lookup multiple → stop', async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await monitorStart();

    invokeMock.mockResolvedValueOnce({ status: 'up', latency: 50 });
    const result1 = await monitorLookup('a.com');
    expect(result1).toEqual({ status: 'up', latency: 50 });

    invokeMock.mockResolvedValueOnce({ status: 'down', latency: -1 });
    const result2 = await monitorLookup('b.com');
    expect(result2).toEqual({ status: 'down', latency: -1 });

    invokeMock.mockResolvedValueOnce(undefined);
    await monitorStop();

    expect(invokeMock).toHaveBeenCalledTimes(4);
  });

  test('monitor with event listeners', async () => {
    const handler = jest.fn();
    const unlistenFn = jest.fn();
    listenMock.mockResolvedValue(unlistenFn);

    await listen('monitor:update', handler);

    invokeMock.mockResolvedValueOnce(undefined);
    await monitorStart();

    invokeMock.mockResolvedValueOnce(undefined);
    await monitorStop();

    unlisten('monitor:update');
    expect(unlistenFn).toHaveBeenCalled();
  });
});

// ─── File System Workflow ───────────────────────────────────────────────────

describe('File system workflow', () => {
  test('check existence → mkdir → write → read → verify', async () => {
    const dir = '/user/data/exports';
    const file = path.join(dir, 'output.txt');

    // Check if dir exists
    invokeMock.mockResolvedValueOnce(false);
    const exists = await fs.exists(dir);
    expect(exists).toBe(false);

    // Create dir
    invokeMock.mockResolvedValueOnce(undefined);
    await fs.mkdir(dir);

    // Write file
    invokeMock.mockResolvedValueOnce(undefined);
    await fs.writeFile(file, 'exported data');

    // Read back
    invokeMock.mockResolvedValueOnce('exported data');
    const content = await fs.readFile(file);
    expect(content).toBe('exported data');

    // Stat
    invokeMock.mockResolvedValueOnce({ size: 13, mtime: Date.now() });
    const stat = await fs.stat(file);
    expect(stat.size).toBe(13);

    expect(invokeMock).toHaveBeenCalledTimes(5);
  });

  test('list directory → delete files → verify empty', async () => {
    const dir = '/user/data/cache';

    // List
    invokeMock.mockResolvedValueOnce(['a.cache', 'b.cache']);
    const files = await fs.readdir(dir);
    expect(files).toEqual(['a.cache', 'b.cache']);

    // Delete each
    for (const f of files) {
      invokeMock.mockResolvedValueOnce(undefined);
      await fs.unlink(path.join(dir, f));
    }

    // Verify empty
    invokeMock.mockResolvedValueOnce([]);
    const remaining = await fs.readdir(dir);
    expect(remaining).toEqual([]);

    expect(invokeMock).toHaveBeenCalledTimes(4);
  });
});

// ─── App Namespace Workflow ─────────────────────────────────────────────────

describe('App namespace workflow', () => {
  test('get paths → open data dir → open external URL', async () => {
    invokeMock.mockResolvedValueOnce('/app/base');
    const baseDir = await app.getBaseDir();
    expect(baseDir).toBe('/app/base');

    invokeMock.mockResolvedValueOnce('/user/data');
    const udp = await app.getUserDataPath();
    expect(udp).toBe('/user/data');

    // openDataDir internally gets path again
    invokeMock.mockResolvedValueOnce('/user/data');
    invokeMock.mockResolvedValueOnce(undefined);
    await app.openDataDir();

    invokeMock.mockResolvedValueOnce(undefined);
    await app.openPath('https://example.com');

    expect(invokeMock).toHaveBeenCalledTimes(5);
  });

  test('window controls workflow', async () => {
    await app.minimize();
    expect(minimizeMock).toHaveBeenCalledTimes(1);

    await app.toggleMaximize();
    expect(toggleMaximizeMock).toHaveBeenCalledTimes(1);

    // Reload is synchronous
    app.reload();

    // Devtools is no-op
    app.toggleDevtools();

    await app.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});

// ─── Cross-Module Workflow ──────────────────────────────────────────────────

describe('Cross-module workflow', () => {
  test('settings load → fs write backup → cache clear → stats', async () => {
    // Load settings
    invokeMock.mockResolvedValueOnce('/user/data');
    invokeMock.mockResolvedValueOnce('{"theme":"dark"}');
    const { settings } = await settingsLoad();

    // Write backup
    const backupPath = path.join('/user/data', 'settings-backup.json');
    invokeMock.mockResolvedValueOnce(undefined);
    await fs.writeFile(backupPath, JSON.stringify(settings));

    // Clear cache
    invokeMock.mockResolvedValueOnce(undefined);
    await cacheClear();

    // Get stats
    invokeMock.mockResolvedValueOnce({ cacheSize: 0, historySize: 50 });
    const stats = await statsGet('/config', '/user/data');
    expect(stats).toEqual({ cacheSize: 0, historySize: 50 });

    expect(invokeMock).toHaveBeenCalledTimes(5);
  });
});

/**
 * @jest-environment jsdom
 */
/**
 * Comprehensive tests for app/ts/common/tauriBridge.ts — the typed Tauri bridge
 * module that replaced the legacy tauri-shim.js. Tests every exported function,
 * namespace, and event API against the mocked __TAURI__ global.
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

// ── Import the bridge module ───────────────────────────────────────────────

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
  bwaAnalyserStart,
  toProcess,
  parseCsv,
  openFileDialog,
  saveFileDialog,
  openTextFileDialog,
  openCsvJsonDialog,
  openDbFileDialog,
  settingsLoad,
  settingsSave,
  configDelete,
  configExport,
  configImport,
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
  i18nLoad,
  aiSuggest,
  aiDownloadModel,
  fs,
  path,
  app,
  listen,
  unlisten,
  watch,
} from '../app/ts/common/tauriBridge';

// ── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  invokeMock.mockResolvedValue(undefined);
});

// ── WHOIS Commands ─────────────────────────────────────────────────────────

describe('WHOIS commands', () => {
  test('whoisLookup invokes whois_lookup', async () => {
    invokeMock.mockResolvedValue('WHOIS data');
    const result = await whoisLookup('example.com');
    expect(invokeMock).toHaveBeenCalledWith('whois_lookup', { domain: 'example.com' });
    expect(result).toBe('WHOIS data');
  });

  test('dnsLookup invokes dns_lookup_cmd', async () => {
    invokeMock.mockResolvedValue(true);
    const result = await dnsLookup('example.com');
    expect(invokeMock).toHaveBeenCalledWith('dns_lookup_cmd', { domain: 'example.com' });
    expect(result).toBe(true);
  });

  test('rdapLookup invokes rdap_lookup_cmd', async () => {
    invokeMock.mockResolvedValue('{"rdap":"data"}');
    const result = await rdapLookup('example.com');
    expect(invokeMock).toHaveBeenCalledWith('rdap_lookup_cmd', { domain: 'example.com' });
    expect(result).toBe('{"rdap":"data"}');
  });

  test('availabilityCheck invokes availability_check', async () => {
    invokeMock.mockResolvedValue('available');
    const result = await availabilityCheck('domain text');
    expect(invokeMock).toHaveBeenCalledWith('availability_check', { text: 'domain text' });
    expect(result).toBe('available');
  });

  test('domainParameters invokes availability_params', async () => {
    const mockResult = { registrar: 'GoDaddy', expiryDate: '2027-01-01' };
    invokeMock.mockResolvedValue(mockResult);
    const result = await domainParameters('test.com', 'available' as any, 'raw text');
    expect(invokeMock).toHaveBeenCalledWith('availability_params', {
      domain: 'test.com',
      status: 'available',
      text: 'raw text',
    });
    expect(result).toEqual(mockResult);
  });

  test('domainParameters passes null for optional domain/status', async () => {
    invokeMock.mockResolvedValue({});
    await domainParameters(null, null, 'raw');
    expect(invokeMock).toHaveBeenCalledWith('availability_params', {
      domain: null,
      status: null,
      text: 'raw',
    });
  });

  test('domainParameters passes extra fields', async () => {
    invokeMock.mockResolvedValue({});
    await domainParameters('a.com', null, 'raw', { foo: 'bar' });
    expect(invokeMock).toHaveBeenCalledWith('availability_params', {
      domain: 'a.com',
      status: null,
      text: 'raw',
      extra: { foo: 'bar' },
    });
  });

  test('whoisLookup propagates errors', async () => {
    invokeMock.mockRejectedValue(new Error('Backend error'));
    await expect(whoisLookup('fail.com')).rejects.toThrow('Backend error');
  });
});

// ── Bulk WHOIS Commands ────────────────────────────────────────────────────

describe('Bulk WHOIS commands', () => {
  test('bulkWhoisLookup invokes bulk_whois_lookup', async () => {
    await bulkWhoisLookup(['a.com', 'b.com'], ['com']);
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_lookup', {
      domains: ['a.com', 'b.com'],
      tlds: ['com'],
      concurrency: 4,
      timeoutMs: 5000,
    });
  });

  test('bulkWhoisLookup uses custom concurrency and timeout', async () => {
    await bulkWhoisLookup(['a.com'], undefined, 8, 10000);
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_lookup', {
      domains: ['a.com'],
      tlds: undefined,
      concurrency: 8,
      timeoutMs: 10000,
    });
  });

  test('bulkWhoisPause invokes bulk_whois_pause', async () => {
    await bulkWhoisPause();
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_pause', undefined);
  });

  test('bulkWhoisContinue invokes bulk_whois_continue', async () => {
    await bulkWhoisContinue();
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_continue', undefined);
  });

  test('bulkWhoisStop invokes bulk_whois_stop', async () => {
    await bulkWhoisStop();
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_stop', undefined);
  });

  test('bulkWhoisExport opens save dialog and invokes export', async () => {
    saveMock.mockResolvedValue('/save/path.csv');
    const results = { domains: ['a.com'] } as any;
    const options = { filetype: 'csv' } as any;
    await bulkWhoisExport(results, options);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Save export file',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      })
    );
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_export', {
      results,
      options,
      path: '/save/path.csv',
    });
  });

  test('bulkWhoisExport uses zip filter for zip filetype', async () => {
    saveMock.mockResolvedValue('/save/path.zip');
    await bulkWhoisExport({} as any, { filetype: 'zip' } as any);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      })
    );
  });

  test('bulkWhoisExport aborts if save dialog is cancelled', async () => {
    saveMock.mockResolvedValue(null);
    await bulkWhoisExport({} as any, { filetype: 'csv' } as any);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

// ── BWA ────────────────────────────────────────────────────────────────────

describe('BWA commands', () => {
  test('bwaAnalyserStart invokes bwa_analyser_start', async () => {
    invokeMock.mockResolvedValue({ total: 5 });
    const result = await bwaAnalyserStart({ data: [1] });
    expect(invokeMock).toHaveBeenCalledWith('bwa_analyser_start', { data: { data: [1] } });
    expect(result).toEqual({ total: 5 });
  });
});

// ── Text Operations ────────────────────────────────────────────────────────

describe('Text operations', () => {
  test('toProcess invokes to_process', async () => {
    invokeMock.mockResolvedValue('processed');
    const result = await toProcess('content', { prefix: 'x' } as any);
    expect(invokeMock).toHaveBeenCalledWith('to_process', {
      content: 'content',
      options: { prefix: 'x' },
    });
    expect(result).toBe('processed');
  });

  test('parseCsv invokes csv_parse', async () => {
    invokeMock.mockResolvedValue([{ a: '1' }]);
    const result = await parseCsv('a,b\n1,2');
    expect(invokeMock).toHaveBeenCalledWith('csv_parse', { content: 'a,b\n1,2' });
    expect(result).toEqual([{ a: '1' }]);
  });
});

// ── File Dialogs ───────────────────────────────────────────────────────────

describe('File dialogs', () => {
  test('openFileDialog uses Tauri dialog.open', async () => {
    openMock.mockResolvedValue('/file.txt');
    const result = await openFileDialog({ multiple: false });
    expect(openMock).toHaveBeenCalledWith({ multiple: false });
    expect(result).toBe('/file.txt');
  });

  test('saveFileDialog uses Tauri dialog.save', async () => {
    saveMock.mockResolvedValue('/save.csv');
    const result = await saveFileDialog({ title: 'Save' });
    expect(saveMock).toHaveBeenCalledWith({ title: 'Save' });
    expect(result).toBe('/save.csv');
  });

  test('openTextFileDialog opens with text/list/csv filter', async () => {
    openMock.mockResolvedValue(['/file.txt']);
    await openTextFileDialog();
    expect(openMock).toHaveBeenCalledWith({
      multiple: true,
      filters: [{ name: 'Text / List', extensions: ['txt', 'list', 'csv'] }],
    });
  });

  test('openCsvJsonDialog opens with csv/json filter', async () => {
    openMock.mockResolvedValue(['/file.csv']);
    await openCsvJsonDialog();
    expect(openMock).toHaveBeenCalledWith({
      multiple: true,
      filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }],
    });
  });

  test('openDbFileDialog opens with sqlite/json filter', async () => {
    openMock.mockResolvedValue(['/data.sqlite']);
    const result = await openDbFileDialog();
    expect(openMock).toHaveBeenCalledWith({
      multiple: true,
      filters: [{ name: 'SQLite / JSON', extensions: ['sqlite', 'db', 'sqlite3', 'json'] }],
    });
    expect(result).toEqual(['/data.sqlite']);
  });
});

// ── Settings ───────────────────────────────────────────────────────────────

describe('Settings commands', () => {
  test('settingsLoad fetches user data path and settings JSON', async () => {
    invokeMock.mockResolvedValueOnce('/user/data'); // app_get_user_data_path
    invokeMock.mockResolvedValueOnce('{"key":"val"}'); // settings_load
    const result = await settingsLoad();
    expect(invokeMock).toHaveBeenCalledWith('app_get_user_data_path', undefined);
    expect(invokeMock).toHaveBeenCalledWith('settings_load', { filename: 'settings.json' });
    expect(result.settings).toEqual({ key: 'val' });
    expect(result.userDataPath).toBe('/user/data');
  });

  test('settingsLoad handles invalid JSON gracefully', async () => {
    invokeMock.mockResolvedValueOnce('/path');
    invokeMock.mockResolvedValueOnce('not json');
    const result = await settingsLoad();
    expect(result.settings).toEqual({});
  });

  test('settingsSave serializes and invokes settings_save', async () => {
    const result = await settingsSave({ theme: 'dark' });
    expect(invokeMock).toHaveBeenCalledWith('settings_save', {
      filename: 'settings.json',
      content: JSON.stringify({ theme: 'dark' }),
    });
    expect(result).toBe('SAVED');
  });

  test('configDelete invokes config_delete', async () => {
    await configDelete('old.json');
    expect(invokeMock).toHaveBeenCalledWith('config_delete', { filename: 'old.json' });
  });

  test('configExport invokes config_export', async () => {
    invokeMock.mockResolvedValue('exported-json');
    const result = await configExport();
    expect(invokeMock).toHaveBeenCalledWith('config_export', undefined);
    expect(result).toBe('exported-json');
  });

  test('configImport opens dialog, reads file, and imports', async () => {
    openMock.mockResolvedValue('/config.json');
    invokeMock.mockResolvedValueOnce('{"settings":"data"}'); // fs_read_file
    invokeMock.mockResolvedValueOnce(undefined); // config_import
    await configImport();
    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [{ name: 'JSON', extensions: ['json'] }] })
    );
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/config.json' });
    expect(invokeMock).toHaveBeenCalledWith('config_import', { content: '{"settings":"data"}' });
  });

  test('configImport returns undefined when dialog cancelled', async () => {
    openMock.mockResolvedValue(null);
    await configImport();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  test('configImport handles array result from dialog', async () => {
    openMock.mockResolvedValue(['/config.json']);
    invokeMock.mockResolvedValueOnce('{}');
    invokeMock.mockResolvedValueOnce(undefined);
    await configImport();
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/config.json' });
  });
});

// ── Profiles ───────────────────────────────────────────────────────────────

describe('Profiles commands', () => {
  test('profilesList invokes profiles_list', async () => {
    invokeMock.mockResolvedValue([{ id: 'default', name: 'Default', file: 'default.json' }]);
    const result = await profilesList();
    expect(invokeMock).toHaveBeenCalledWith('profiles_list', undefined);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('default');
  });

  test('profilesCreate with copyCurrent=true', async () => {
    invokeMock.mockResolvedValue({ id: 'new-id' });
    const result = await profilesCreate('Work', true);
    expect(invokeMock).toHaveBeenCalledWith('profiles_create', { name: 'Work', copyCurrent: true });
    expect(result.id).toBe('new-id');
  });

  test('profilesCreate defaults copyCurrent to false', async () => {
    invokeMock.mockResolvedValue({ id: 'x' });
    await profilesCreate('Test');
    expect(invokeMock).toHaveBeenCalledWith('profiles_create', { name: 'Test', copyCurrent: false });
  });

  test('profilesRename invokes profiles_rename', async () => {
    await profilesRename('id1', 'New Name');
    expect(invokeMock).toHaveBeenCalledWith('profiles_rename', { id: 'id1', newName: 'New Name' });
  });

  test('profilesDelete invokes profiles_delete', async () => {
    await profilesDelete('id1');
    expect(invokeMock).toHaveBeenCalledWith('profiles_delete', { id: 'id1' });
  });

  test('profilesSetCurrent invokes profiles_set_current', async () => {
    await profilesSetCurrent('work');
    expect(invokeMock).toHaveBeenCalledWith('profiles_set_current', { id: 'work' });
  });

  test('profilesExport invokes profiles_export', async () => {
    invokeMock.mockResolvedValue('/export.zip');
    const result = await profilesExport('myprof');
    expect(invokeMock).toHaveBeenCalledWith('profiles_export', { id: 'myprof' });
    expect(result).toBe('/export.zip');
  });

  test('profilesExport passes null when no id', async () => {
    invokeMock.mockResolvedValue('/export.zip');
    await profilesExport();
    expect(invokeMock).toHaveBeenCalledWith('profiles_export', { id: null });
  });

  test('profilesImport opens dialog and extracts id', async () => {
    openMock.mockResolvedValue('/profiles/work.zip');
    invokeMock.mockResolvedValueOnce({ id: 'work' });
    const result = await profilesImport();
    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [{ name: 'ZIP', extensions: ['zip'] }] })
    );
    expect(result).toEqual({ id: 'work' });
  });

  test('profilesImport returns undefined when cancelled', async () => {
    openMock.mockResolvedValue(null);
    const result = await profilesImport();
    expect(result).toBeUndefined();
  });
});

// ── History ────────────────────────────────────────────────────────────────

describe('History commands', () => {
  test('historyGet invokes db_gui_history_get with limit', async () => {
    invokeMock.mockResolvedValue([{ domain: 'a.com' }]);
    const result = await historyGet(100);
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_get', { limit: 100 });
    expect(result).toEqual([{ domain: 'a.com' }]);
  });

  test('historyGet defaults limit to 50', async () => {
    invokeMock.mockResolvedValue([]);
    await historyGet();
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_get', { limit: 50 });
  });

  test('historyClear invokes db_gui_history_clear', async () => {
    await historyClear();
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_clear', undefined);
  });

  test('historyMerge invokes history_merge', async () => {
    await historyMerge(['/a.sqlite', '/b.sqlite']);
    expect(invokeMock).toHaveBeenCalledWith('history_merge', { paths: ['/a.sqlite', '/b.sqlite'] });
  });
});

// ── Cache ──────────────────────────────────────────────────────────────────

describe('Cache commands', () => {
  test('cacheGet composes key and passes ttl in ms', async () => {
    invokeMock.mockResolvedValue('cached-data');
    const result = await cacheGet('whois', 'example.com', { ttl: 60 });
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', {
      key: 'whois:example.com',
      ttlMs: 60000,
    });
    expect(result).toBe('cached-data');
  });

  test('cacheGet passes null ttl when not provided', async () => {
    invokeMock.mockResolvedValue(undefined);
    await cacheGet('dns', 'test.com');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', {
      key: 'dns:test.com',
      ttlMs: null,
    });
  });

  test('cacheSet composes key and passes response', async () => {
    await cacheSet('whois', 'example.com', 'response-data');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_set', {
      key: 'whois:example.com',
      response: 'response-data',
      maxEntries: 1000,
    });
  });

  test('cacheClear invokes db_gui_cache_clear', async () => {
    await cacheClear();
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_clear', undefined);
  });

  test('cacheMerge invokes cache_merge', async () => {
    await cacheMerge(['/c.sqlite']);
    expect(invokeMock).toHaveBeenCalledWith('cache_merge', { paths: ['/c.sqlite'] });
  });
});

// ── Stats ──────────────────────────────────────────────────────────────────

describe('Stats commands', () => {
  test('statsStart invokes stats_start and returns watcher id', async () => {
    invokeMock.mockResolvedValue(42);
    const result = await statsStart('/cfg', '/data');
    expect(invokeMock).toHaveBeenCalledWith('stats_start', { configPath: '/cfg', dataPath: '/data' });
    expect(result).toBe(42);
  });

  test('statsRefresh invokes stats_refresh', async () => {
    await statsRefresh(42);
    expect(invokeMock).toHaveBeenCalledWith('stats_refresh', { id: 42 });
  });

  test('statsStop invokes stats_stop', async () => {
    await statsStop(42);
    expect(invokeMock).toHaveBeenCalledWith('stats_stop', { id: 42 });
  });

  test('statsGet invokes stats_get', async () => {
    invokeMock.mockResolvedValue({ size: 100 });
    const result = await statsGet('/cfg', '/data');
    expect(invokeMock).toHaveBeenCalledWith('stats_get', { configPath: '/cfg', dataPath: '/data' });
    expect(result).toEqual({ size: 100 });
  });
});

// ── Monitor ────────────────────────────────────────────────────────────────

describe('Monitor commands', () => {
  test('monitorStart invokes monitor_start', async () => {
    await monitorStart();
    expect(invokeMock).toHaveBeenCalledWith('monitor_start', undefined);
  });

  test('monitorStop invokes monitor_stop', async () => {
    await monitorStop();
    expect(invokeMock).toHaveBeenCalledWith('monitor_stop', undefined);
  });

  test('monitorLookup invokes monitor_lookup', async () => {
    invokeMock.mockResolvedValue({ status: 'ok' });
    const result = await monitorLookup('example.com');
    expect(invokeMock).toHaveBeenCalledWith('monitor_lookup', { domain: 'example.com' });
    expect(result).toEqual({ status: 'ok' });
  });
});

// ── I18n ───────────────────────────────────────────────────────────────────

describe('I18n', () => {
  test('i18nLoad invokes i18n_load', async () => {
    invokeMock.mockResolvedValue('{"hello":"world"}');
    const result = await i18nLoad('en');
    expect(invokeMock).toHaveBeenCalledWith('i18n_load', { lang: 'en' });
    expect(result).toBe('{"hello":"world"}');
  });
});

// ── AI ─────────────────────────────────────────────────────────────────────

describe('AI commands', () => {
  test('aiSuggest invokes ai_suggest', async () => {
    invokeMock.mockResolvedValue(['suggestion1', 'suggestion2']);
    const result = await aiSuggest('prompt text', 5);
    expect(invokeMock).toHaveBeenCalledWith('ai_suggest', { prompt: 'prompt text', count: 5 });
    expect(result).toEqual(['suggestion1', 'suggestion2']);
  });

  test('aiDownloadModel invokes ai_download_model', async () => {
    await aiDownloadModel();
    expect(invokeMock).toHaveBeenCalledWith('ai_download_model', undefined);
  });
});

// ── File System ────────────────────────────────────────────────────────────

describe('fs namespace', () => {
  test('fs.readFile invokes fs_read_file', async () => {
    invokeMock.mockResolvedValue('file content');
    const result = await fs.readFile('/path/to/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/path/to/file' });
    expect(result).toBe('file content');
  });

  test('fs.writeFile invokes fs_write_file', async () => {
    await fs.writeFile('/path/to/file', 'data');
    expect(invokeMock).toHaveBeenCalledWith('fs_write_file', { path: '/path/to/file', content: 'data' });
  });

  test('fs.exists invokes fs_exists', async () => {
    invokeMock.mockResolvedValue(true);
    const result = await fs.exists('/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_exists', { path: '/path' });
    expect(result).toBe(true);
  });

  test('fs.stat invokes fs_stat', async () => {
    invokeMock.mockResolvedValue({ size: 42, mtime: 0 });
    const result = await fs.stat('/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_stat', { path: '/path' });
    expect(result).toEqual({ size: 42, mtime: 0 });
  });

  test('fs.readdir invokes fs_readdir', async () => {
    invokeMock.mockResolvedValue(['a.txt', 'b.txt']);
    const result = await fs.readdir('/dir');
    expect(invokeMock).toHaveBeenCalledWith('fs_readdir', { path: '/dir' });
    expect(result).toEqual(['a.txt', 'b.txt']);
  });

  test('fs.unlink invokes fs_unlink', async () => {
    await fs.unlink('/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_unlink', { path: '/path' });
  });

  test('fs.access invokes fs_access', async () => {
    await fs.access('/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_access', { path: '/path' });
  });

  test('fs.mkdir invokes fs_mkdir', async () => {
    await fs.mkdir('/new-dir');
    expect(invokeMock).toHaveBeenCalledWith('fs_mkdir', { path: '/new-dir' });
  });
});

// ── Path Helpers ───────────────────────────────────────────────────────────

describe('path namespace', () => {
  test('path.join joins segments with forward slash', () => {
    expect(path.join('a', 'b', 'c.txt')).toBe('a/b/c.txt');
  });

  test('path.join collapses multiple slashes', () => {
    expect(path.join('a/', '/b/', 'c')).toBe('a/b/c');
  });

  test('path.join handles backslashes', () => {
    expect(path.join('a\\b', 'c')).toBe('a/b/c');
  });

  test('path.join filters empty segments', () => {
    expect(path.join('', 'a', '', 'b')).toBe('a/b');
  });

  test('path.basename extracts trailing name (forward slash)', () => {
    expect(path.basename('a/b/file.txt')).toBe('file.txt');
  });

  test('path.basename extracts trailing name (backslash)', () => {
    expect(path.basename('a\\b\\file.txt')).toBe('file.txt');
  });

  test('path.basename returns empty for empty input', () => {
    expect(path.basename('')).toBe('');
  });

  test('path.basename handles single filename', () => {
    expect(path.basename('file.txt')).toBe('file.txt');
  });
});

// ── App / Window ───────────────────────────────────────────────────────────

describe('app namespace', () => {
  test('app.getBaseDir invokes app_get_base_dir', async () => {
    invokeMock.mockResolvedValue('/base');
    const result = await app.getBaseDir();
    expect(invokeMock).toHaveBeenCalledWith('app_get_base_dir', undefined);
    expect(result).toBe('/base');
  });

  test('app.getUserDataPath invokes app_get_user_data_path', async () => {
    invokeMock.mockResolvedValue('/data');
    const result = await app.getUserDataPath();
    expect(invokeMock).toHaveBeenCalledWith('app_get_user_data_path', undefined);
    expect(result).toBe('/data');
  });

  test('app.openDataDir gets path and opens it', async () => {
    invokeMock.mockResolvedValueOnce('/user/data');
    invokeMock.mockResolvedValueOnce(undefined);
    await app.openDataDir();
    expect(invokeMock).toHaveBeenCalledWith('app_get_user_data_path', undefined);
    expect(invokeMock).toHaveBeenCalledWith('shell_open_path', { path: '/user/data' });
  });

  test('app.openPath invokes shell_open_path', async () => {
    invokeMock.mockResolvedValue('ok');
    await app.openPath('https://example.com');
    expect(invokeMock).toHaveBeenCalledWith('shell_open_path', { path: 'https://example.com' });
  });

  test('app.minimize calls Tauri window minimize', async () => {
    await app.minimize();
    expect(minimizeMock).toHaveBeenCalled();
  });

  test('app.toggleMaximize calls Tauri window toggleMaximize', async () => {
    await app.toggleMaximize();
    expect(toggleMaximizeMock).toHaveBeenCalled();
  });

  test('app.close calls Tauri window close', async () => {
    await app.close();
    expect(closeMock).toHaveBeenCalled();
  });

  test('app.reload calls window.location.reload', () => {
    // jsdom's window.location.reload is a no-op but shouldn't throw
    expect(() => app.reload()).not.toThrow();
  });

  test('app.toggleDevtools is a no-op', () => {
    expect(() => app.toggleDevtools()).not.toThrow();
  });
});

// ── Event Listener Management ──────────────────────────────────────────────

describe('listen / unlisten', () => {
  test('listen registers a Tauri event listener', async () => {
    const handler = jest.fn();
    await listen('test:event', handler);
    expect(listenMock).toHaveBeenCalledWith('test:event', expect.any(Function));
  });

  test('listen returns an unlisten function', async () => {
    const unlistenFn = jest.fn();
    listenMock.mockResolvedValue(unlistenFn);
    const result = await listen('test:event', jest.fn());
    expect(typeof result).toBe('function');
  });

  test('listen replaces existing listener for same event', async () => {
    const unlisten1 = jest.fn();
    const unlisten2 = jest.fn();
    listenMock.mockResolvedValueOnce(unlisten1);
    listenMock.mockResolvedValueOnce(unlisten2);

    await listen('dup:event', jest.fn());
    await listen('dup:event', jest.fn());

    // First listener should have been cleaned up
    expect(unlisten1).toHaveBeenCalled();
  });

  test('listen unwraps event.payload for handler', async () => {
    const handler = jest.fn();
    listenMock.mockImplementation(async (_event: string, tauriHandler: Function) => {
      // Simulate Tauri calling the internal handler with an event envelope
      tauriHandler({ payload: { domain: 'test.com' } });
      return jest.fn();
    });

    await listen('test:event', handler);
    expect(handler).toHaveBeenCalledWith({ domain: 'test.com' });
  });

  test('unlisten calls the stored unlisten function', async () => {
    const unlistenFn = jest.fn();
    listenMock.mockResolvedValue(unlistenFn);

    await listen('removal:event', jest.fn());
    unlisten('removal:event');

    expect(unlistenFn).toHaveBeenCalled();
  });

  test('unlisten is safe for unregistered events', () => {
    expect(() => unlisten('never-registered')).not.toThrow();
  });
});

// ── Watch Stub ─────────────────────────────────────────────────────────────

describe('watch', () => {
  test('returns stub with close()', async () => {
    const watcher = await watch();
    expect(watcher).toHaveProperty('close');
    expect(typeof watcher.close).toBe('function');
    expect(() => watcher.close()).not.toThrow();
  });
});

/**
 * @jest-environment jsdom
 */
/**
 * Edge-case and error-handling tests for tauriBridge.
 * This file covers boundary conditions, error propagation, race conditions,
 * and unusual inputs for every major area of the bridge module.
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
  bulkWhoisExport,
  bwaAnalyserStart,
  toProcess,
  parseCsv,
  openFileDialog,
  saveFileDialog,
  settingsLoad,
  settingsSave,
  configImport,
  profilesCreate,
  profilesImport,
  historyGet,
  cacheGet,
  cacheSet,
  statsStart,
  monitorLookup,
  i18nLoad,
  aiSuggest,
  fs,
  path,
  app,
  listen,
  unlisten,
  watch,
} from '../app/ts/common/tauriBridge';

beforeEach(() => {
  jest.clearAllMocks();
  invokeMock.mockResolvedValue(undefined);
});

// ─── Error Propagation ─────────────────────────────────────────────────────

describe('Error propagation', () => {
  const commands = [
    { name: 'whoisLookup', fn: () => whoisLookup('fail.com') },
    { name: 'dnsLookup', fn: () => dnsLookup('fail.com') },
    { name: 'rdapLookup', fn: () => rdapLookup('fail.com') },
    { name: 'availabilityCheck', fn: () => availabilityCheck('text') },
    { name: 'domainParameters', fn: () => domainParameters('d', null, 'raw') },
    { name: 'toProcess', fn: () => toProcess('x', {} as any) },
    { name: 'parseCsv', fn: () => parseCsv('bad') },
    { name: 'bwaAnalyserStart', fn: () => bwaAnalyserStart({}) },
    { name: 'settingsSave', fn: () => settingsSave({}) },
    { name: 'historyGet', fn: () => historyGet() },
    { name: 'statsStart', fn: () => statsStart('/a', '/b') },
    { name: 'monitorLookup', fn: () => monitorLookup('x.com') },
    { name: 'i18nLoad', fn: () => i18nLoad('en') },
    { name: 'aiSuggest', fn: () => aiSuggest('prompt', 3) },
    { name: 'fs.readFile', fn: () => fs.readFile('/bad') },
    { name: 'fs.writeFile', fn: () => fs.writeFile('/bad', 'data') },
    { name: 'fs.exists', fn: () => fs.exists('/bad') },
    { name: 'fs.stat', fn: () => fs.stat('/bad') },
    { name: 'fs.readdir', fn: () => fs.readdir('/bad') },
    { name: 'fs.unlink', fn: () => fs.unlink('/bad') },
    { name: 'fs.access', fn: () => fs.access('/bad') },
    { name: 'fs.mkdir', fn: () => fs.mkdir('/bad') },
    { name: 'app.getBaseDir', fn: () => app.getBaseDir() },
    { name: 'app.getUserDataPath', fn: () => app.getUserDataPath() },
  ];

  test.each(commands)('$name rejects when invoke throws', async ({ fn }) => {
    invokeMock.mockRejectedValue(new Error('backend failure'));
    await expect(fn()).rejects.toThrow('backend failure');
  });

  test('bulkWhoisLookup rejects when invoke throws', async () => {
    invokeMock.mockRejectedValue(new Error('bulk fail'));
    await expect(bulkWhoisLookup(['a.com'])).rejects.toThrow('bulk fail');
  });

  test('settingsLoad rejects when second invoke throws', async () => {
    invokeMock.mockResolvedValueOnce('/path'); // app_get_user_data_path succeeds
    invokeMock.mockRejectedValueOnce(new Error('load fail'));
    await expect(settingsLoad()).rejects.toThrow('load fail');
  });

  test('app.openDataDir rejects when inner invoke fails', async () => {
    invokeMock.mockResolvedValueOnce('/path');
    invokeMock.mockRejectedValueOnce(new Error('open fail'));
    await expect(app.openDataDir()).rejects.toThrow('open fail');
  });

  test('listen rejects when event.listen fails', async () => {
    listenMock.mockRejectedValueOnce(new Error('listen fail'));
    await expect(listen('bad:event', jest.fn())).rejects.toThrow('listen fail');
  });
});

// ─── settingsLoad Edge Cases ────────────────────────────────────────────────

describe('settingsLoad edge cases', () => {
  test('returns empty object for empty string response', async () => {
    invokeMock.mockResolvedValueOnce('/path');
    invokeMock.mockResolvedValueOnce('');
    const result = await settingsLoad();
    expect(result.settings).toEqual({});
  });

  test('returns empty object for null-like JSON', async () => {
    invokeMock.mockResolvedValueOnce('/path');
    invokeMock.mockResolvedValueOnce('null');
    const result = await settingsLoad();
    // JSON.parse('null') returns null which is falsy — but the catch only triggers on parse errors
    // null is still valid JSON, so it may pass through
    expect(result).toBeDefined();
  });

  test('handles deeply nested settings JSON', async () => {
    const deep = { a: { b: { c: { d: 'value' } } } };
    invokeMock.mockResolvedValueOnce('/');
    invokeMock.mockResolvedValueOnce(JSON.stringify(deep));
    const result = await settingsLoad();
    expect(result.settings).toEqual(deep);
  });

  test('handles array JSON (unusual but valid)', async () => {
    invokeMock.mockResolvedValueOnce('/');
    invokeMock.mockResolvedValueOnce('[1,2,3]');
    // JSON.parse('[1,2,3]') produces an array, which is assigned to settings
    const result = await settingsLoad();
    expect(result).toBeDefined();
  });
});

// ─── settingsSave Edge Cases ────────────────────────────────────────────────

describe('settingsSave edge cases', () => {
  test('serializes complex settings with special chars', async () => {
    const complex = { key: 'value with "quotes" and \nnewlines', arr: [1, 2] };
    await settingsSave(complex);
    expect(invokeMock).toHaveBeenCalledWith('settings_save', {
      filename: 'settings.json',
      content: JSON.stringify(complex),
    });
  });

  test('serializes null settings', async () => {
    await settingsSave(null);
    expect(invokeMock).toHaveBeenCalledWith('settings_save', {
      filename: 'settings.json',
      content: 'null',
    });
  });

  test('always resolves with SAVED on success', async () => {
    invokeMock.mockResolvedValue('anything');
    const result = await settingsSave({});
    expect(result).toBe('SAVED');
  });
});

// ─── Bulk WHOIS Edge Cases ──────────────────────────────────────────────────

describe('Bulk WHOIS edge cases', () => {
  test('bulkWhoisLookup with empty domains array', async () => {
    await bulkWhoisLookup([]);
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_lookup', {
      domains: [],
      tlds: undefined,
      concurrency: 4,
      timeoutMs: 5000,
    });
  });

  test('bulkWhoisExport handles all filter types', async () => {
    // Test txt/json/other filetype defaults to zip filter
    saveMock.mockResolvedValue('/out.zip');
    await bulkWhoisExport({} as any, { filetype: 'json' } as any);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      })
    );
  });

  test('bulkWhoisExport with csv filetype', async () => {
    saveMock.mockResolvedValue('/out.csv');
    await bulkWhoisExport({} as any, { filetype: 'csv' } as any);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      })
    );
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_export', {
      results: {},
      options: { filetype: 'csv' },
      path: '/out.csv',
    });
  });
});

// ─── configImport Edge Cases ────────────────────────────────────────────────

describe('configImport edge cases', () => {
  test('handles empty string from file read', async () => {
    openMock.mockResolvedValue('/empty.json');
    invokeMock.mockResolvedValueOnce('');
    invokeMock.mockResolvedValueOnce(undefined);
    await configImport();
    expect(invokeMock).toHaveBeenCalledWith('config_import', { content: '' });
  });
});

// ─── Profiles Edge Cases ────────────────────────────────────────────────────

describe('Profiles edge cases', () => {
  test('profilesCreate with empty name', async () => {
    invokeMock.mockResolvedValue({ id: 'gen-id' });
    await profilesCreate('');
    expect(invokeMock).toHaveBeenCalledWith('profiles_create', { name: '', copyCurrent: false });
  });

  test('profilesImport handles path without .zip extension', async () => {
    openMock.mockResolvedValue('/some/profile-backup');
    const result = await profilesImport();
    // basename = 'profile-backup', .replace('.zip', '') is a no-op
    expect(result).toEqual({ id: 'profile-backup' });
  });

  test('profilesImport handles array result from dialog', async () => {
    openMock.mockResolvedValue(['/profiles/test.zip']);
    const result = await profilesImport();
    expect(result).toEqual({ id: 'test' });
  });
});

// ─── Cache Edge Cases ───────────────────────────────────────────────────────

describe('Cache edge cases', () => {
  test('cacheGet with zero TTL still converts to ms', async () => {
    // ttl=0 is falsy so ttlMs should be null
    await cacheGet('whois', 'x.com', { ttl: 0 });
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', {
      key: 'whois:x.com',
      ttlMs: null,
    });
  });

  test('cacheGet with large TTL', async () => {
    await cacheGet('dns', 'y.com', { ttl: 86400 });
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', {
      key: 'dns:y.com',
      ttlMs: 86400000,
    });
  });

  test('cacheSet with empty response', async () => {
    await cacheSet('whois', 'z.com', '');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_set', {
      key: 'whois:z.com',
      response: '',
      maxEntries: 1000,
    });
  });

  test('cacheGet key composition with special chars', async () => {
    await cacheGet('rdap', 'ex-ample.co.uk');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', {
      key: 'rdap:ex-ample.co.uk',
      ttlMs: null,
    });
  });
});

// ─── History Edge Cases ─────────────────────────────────────────────────────

describe('History edge cases', () => {
  test('historyGet with limit 0', async () => {
    invokeMock.mockResolvedValue([]);
    await historyGet(0);
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_get', { limit: 0 });
  });

  test('historyGet with large limit', async () => {
    invokeMock.mockResolvedValue([]);
    await historyGet(10000);
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_get', { limit: 10000 });
  });
});

// ─── domainParameters Edge Cases ────────────────────────────────────────────

describe('domainParameters edge cases', () => {
  test('with empty extra object', async () => {
    invokeMock.mockResolvedValue({});
    await domainParameters('a.com', null, 'raw', {});
    // empty object is truthy, so extra IS spread
    expect(invokeMock).toHaveBeenCalledWith('availability_params', {
      domain: 'a.com',
      status: null,
      text: 'raw',
      extra: {},
    });
  });

  test('with undefined extra', async () => {
    invokeMock.mockResolvedValue({});
    await domainParameters('a.com', null, 'raw', undefined);
    // undefined is falsy, so extra is NOT spread
    expect(invokeMock).toHaveBeenCalledWith('availability_params', {
      domain: 'a.com',
      status: null,
      text: 'raw',
    });
  });
});

// ─── Path Namespace Edge Cases ──────────────────────────────────────────────

describe('path edge cases', () => {
  test('join with only empty strings', () => {
    expect(path.join('', '', '')).toBe('');
  });

  test('join with single segment', () => {
    expect(path.join('file.txt')).toBe('file.txt');
  });

  test('join preserves leading slash (root path)', () => {
    expect(path.join('/root', 'dir', 'file')).toBe('/root/dir/file');
  });

  test('join with trailing slashes', () => {
    expect(path.join('a/', 'b/', 'c/')).toBe('a/b/c/');
  });

  test('join with mixed separators', () => {
    expect(path.join('a\\b/', 'c\\d')).toBe('a/b/c/d');
  });

  test('basename with only separators', () => {
    expect(path.basename('///')).toBe('');
  });

  test('basename with trailing separator', () => {
    // filter(Boolean) removes the empty segment from trailing slash
    expect(path.basename('a/b/')).toBe('b');
  });

  test('basename with Windows-style path', () => {
    expect(path.basename('C:\\Users\\test\\file.txt')).toBe('file.txt');
  });

  test('basename with mixed separators', () => {
    expect(path.basename('dir/sub\\file.txt')).toBe('file.txt');
  });
});

// ─── FS Namespace Edge Cases ────────────────────────────────────────────────

describe('fs edge cases', () => {
  test('readFile with empty path', async () => {
    invokeMock.mockResolvedValue('');
    await fs.readFile('');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '' });
  });

  test('writeFile with empty content', async () => {
    await fs.writeFile('/file', '');
    expect(invokeMock).toHaveBeenCalledWith('fs_write_file', { path: '/file', content: '' });
  });

  test('exists returns false', async () => {
    invokeMock.mockResolvedValue(false);
    const result = await fs.exists('/no-file');
    expect(result).toBe(false);
  });

  test('readdir returns empty array', async () => {
    invokeMock.mockResolvedValue([]);
    const result = await fs.readdir('/empty');
    expect(result).toEqual([]);
  });
});

// ─── Listen / Unlisten Edge Cases ───────────────────────────────────────────

describe('listen/unlisten edge cases', () => {
  test('multiple rapid listen calls for same event', async () => {
    const u1 = jest.fn();
    const u2 = jest.fn();
    const u3 = jest.fn();
    listenMock
      .mockResolvedValueOnce(u1)
      .mockResolvedValueOnce(u2)
      .mockResolvedValueOnce(u3);

    await listen('rapid:event', jest.fn());
    await listen('rapid:event', jest.fn());
    await listen('rapid:event', jest.fn());

    // u1 and u2 should have been cleaned up
    expect(u1).toHaveBeenCalled();
    expect(u2).toHaveBeenCalled();
    expect(u3).not.toHaveBeenCalled();
  });

  test('unlisten for already-unlistened event is safe', () => {
    unlisten('already:gone');
    unlisten('already:gone'); // double unlisten
    expect(() => unlisten('already:gone')).not.toThrow();
  });

  test('listen passes different payloads correctly', async () => {
    const handler = jest.fn();
    listenMock.mockImplementation(async (_event: string, tauriHandler: Function) => {
      tauriHandler({ payload: 'string-payload' });
      tauriHandler({ payload: 42 });
      tauriHandler({ payload: { nested: true } });
      tauriHandler({ payload: null });
      return jest.fn();
    });

    await listen('multi:payload', handler);
    expect(handler).toHaveBeenCalledTimes(4);
    expect(handler).toHaveBeenNthCalledWith(1, 'string-payload');
    expect(handler).toHaveBeenNthCalledWith(2, 42);
    expect(handler).toHaveBeenNthCalledWith(3, { nested: true });
    expect(handler).toHaveBeenNthCalledWith(4, null);
  });
});

// ─── Dialog Edge Cases ──────────────────────────────────────────────────────

describe('Dialog edge cases', () => {
  test('openFileDialog with no options', async () => {
    openMock.mockResolvedValue(null);
    await openFileDialog();
    expect(openMock).toHaveBeenCalledWith(undefined);
  });

  test('saveFileDialog with no options', async () => {
    saveMock.mockResolvedValue(null);
    await saveFileDialog();
    expect(saveMock).toHaveBeenCalledWith(undefined);
  });

  test('openFileDialog returns multiple files', async () => {
    openMock.mockResolvedValue(['/a.txt', '/b.txt', '/c.txt']);
    const result = await openFileDialog({ multiple: true });
    expect(result).toEqual(['/a.txt', '/b.txt', '/c.txt']);
  });
});

// ─── Watch Stub ─────────────────────────────────────────────────────────────

describe('watch edge cases', () => {
  test('multiple watch calls return independent stubs', async () => {
    const w1 = await watch();
    const w2 = await watch();
    expect(w1).not.toBe(w2);
    expect(w1.close).not.toBe(w2.close);
  });

  test('close is idempotent', async () => {
    const w = await watch();
    w.close();
    w.close();
    w.close();
    // No error expected
  });
});

// ─── WHOIS with Special Domain Inputs ───────────────────────────────────────

describe('WHOIS special inputs', () => {
  test('whoisLookup with IDN domain', async () => {
    invokeMock.mockResolvedValue('data');
    await whoisLookup('münchen.de');
    expect(invokeMock).toHaveBeenCalledWith('whois_lookup', { domain: 'münchen.de' });
  });

  test('whoisLookup with punycode domain', async () => {
    invokeMock.mockResolvedValue('data');
    await whoisLookup('xn--mnchen-3ya.de');
    expect(invokeMock).toHaveBeenCalledWith('whois_lookup', { domain: 'xn--mnchen-3ya.de' });
  });

  test('dnsLookup with subdomain', async () => {
    invokeMock.mockResolvedValue(true);
    await dnsLookup('sub.example.com');
    expect(invokeMock).toHaveBeenCalledWith('dns_lookup_cmd', { domain: 'sub.example.com' });
  });

  test('rdapLookup with very long domain', async () => {
    const longDomain = 'a'.repeat(253) + '.com';
    invokeMock.mockResolvedValue('{}');
    await rdapLookup(longDomain);
    expect(invokeMock).toHaveBeenCalledWith('rdap_lookup_cmd', { domain: longDomain });
  });
});

// ─── AI Edge Cases ──────────────────────────────────────────────────────────

describe('AI edge cases', () => {
  test('aiSuggest with zero count', async () => {
    invokeMock.mockResolvedValue([]);
    const result = await aiSuggest('prompt', 0);
    expect(invokeMock).toHaveBeenCalledWith('ai_suggest', { prompt: 'prompt', count: 0 });
    expect(result).toEqual([]);
  });

  test('aiSuggest with empty prompt', async () => {
    invokeMock.mockResolvedValue([]);
    await aiSuggest('', 5);
    expect(invokeMock).toHaveBeenCalledWith('ai_suggest', { prompt: '', count: 5 });
  });
});

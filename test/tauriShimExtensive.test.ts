/**
 * @jest-environment jsdom
 */
/**
 * Extensive tests for app/html/tauri-shim.js — covers all IPC channels,
 * send(), on(), off(), and convenience helpers.
 *
 * The base tauriShim.test.ts covers 10 channels. This file covers the
 * remaining channels and the send/on/off APIs comprehensively.
 */

// ── Tauri global mock ──────────────────────────────────────────────────────

const invokeMock = jest.fn();
const listenMock = jest.fn().mockResolvedValue(jest.fn());
const saveMock = jest.fn();
const openMock = jest.fn();
const minimizeMock = jest.fn();
const toggleMaximizeMock = jest.fn();
const closeMock = jest.fn();
const showMock = jest.fn();

(window as any).__TAURI__ = {
  core: { invoke: invokeMock },
  event: { listen: listenMock },
  dialog: { save: saveMock, open: openMock },
  window: {
    getCurrentWindow: () => ({
      minimize: minimizeMock,
      toggleMaximize: toggleMaximizeMock,
      close: closeMock,
      show: showMock
    })
  }
};

require('../app/html/tauri-shim.js');

const electron = (window as any).electron;

// ── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── invoke() channel mapping tests ─────────────────────────────────────────

describe('Tauri Shim — invoke channels', () => {

  // ── Bulk WHOIS control ────────────────────────────────────────────────

  test('bulkwhois:lookup.pause', async () => {
    await electron.invoke('bulkwhois:lookup.pause');
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_pause');
  });

  test('bulkwhois:lookup.continue', async () => {
    await electron.invoke('bulkwhois:lookup.continue');
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_continue');
  });

  test('bulkwhois:lookup.stop', async () => {
    await electron.invoke('bulkwhois:lookup.stop');
    expect(invokeMock).toHaveBeenCalledWith('bulk_whois_stop');
  });

  test('bulkwhois:input.file opens file dialog', async () => {
    openMock.mockResolvedValue(['/path/to/file.txt']);
    const result = await electron.invoke('bulkwhois:input.file');
    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true })
    );
    expect(result).toEqual(['/path/to/file.txt']);
  });

  test('bulkwhois:input.wordlist is a noop', async () => {
    const result = await electron.invoke('bulkwhois:input.wordlist');
    expect(result).toBeUndefined();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  test('bulkwhois:export.cancel is a noop', async () => {
    const result = await electron.invoke('bulkwhois:export.cancel');
    expect(result).toBeUndefined();
  });

  test('bulkwhois:export aborts when save dialog is cancelled', async () => {
    saveMock.mockResolvedValue(null);
    const result = await electron.invoke('bulkwhois:export', [], { filetype: 'csv' });
    expect(invokeMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  // ── BWA (Bulk Whois Analyser) ─────────────────────────────────────────

  test('bwa:input.file opens dialog for CSV/JSON', async () => {
    openMock.mockResolvedValue(['/data/report.csv']);
    const result = await electron.invoke('bwa:input.file');
    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({
        multiple: true,
        filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }]
      })
    );
    expect(result).toEqual(['/data/report.csv']);
  });

  test('bwa:analyser.start', async () => {
    const data = { domain: ['a.com'], status: ['available'] };
    invokeMock.mockResolvedValue({ total: 1 });
    const result = await electron.invoke('bwa:analyser.start', data);
    expect(invokeMock).toHaveBeenCalledWith('bwa_analyser_start', { data });
    expect(result).toEqual({ total: 1 });
  });

  // ── Text Operations ───────────────────────────────────────────────────

  test('to:input.file opens dialog for text files', async () => {
    openMock.mockResolvedValue('/file.txt');
    await electron.invoke('to:input.file');
    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: false })
    );
  });

  test('to:process invokes to_process', async () => {
    invokeMock.mockResolvedValue('processed');
    const result = await electron.invoke('to:process', 'content', { prefix: 'x' });
    expect(invokeMock).toHaveBeenCalledWith('to_process', { content: 'content', options: { prefix: 'x' } });
    expect(result).toBe('processed');
  });

  // ── CSV ───────────────────────────────────────────────────────────────

  test('csv:parse invokes csv_parse', async () => {
    invokeMock.mockResolvedValue([{ a: '1' }]);
    const result = await electron.invoke('csv:parse', 'a,b\n1,2');
    expect(invokeMock).toHaveBeenCalledWith('csv_parse', { content: 'a,b\n1,2' });
    expect(result).toEqual([{ a: '1' }]);
  });

  // ── FS operations ─────────────────────────────────────────────────────

  test('fs:writeFile', async () => {
    await electron.invoke('fs:writeFile', '/path', 'content');
    expect(invokeMock).toHaveBeenCalledWith('fs_write_file', { path: '/path', content: 'content' });
  });

  test('fs:exists', async () => {
    invokeMock.mockResolvedValue(true);
    const result = await electron.invoke('fs:exists', '/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_exists', { path: '/path' });
    expect(result).toBe(true);
  });

  test('fs:stat', async () => {
    invokeMock.mockResolvedValue({ size: 100 });
    const result = await electron.invoke('fs:stat', '/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_stat', { path: '/path' });
    expect(result).toEqual({ size: 100 });
  });

  test('fs:readdir', async () => {
    invokeMock.mockResolvedValue(['a.txt', 'b.txt']);
    const result = await electron.invoke('fs:readdir', '/dir');
    expect(invokeMock).toHaveBeenCalledWith('fs_readdir', { path: '/dir' });
    expect(result).toEqual(['a.txt', 'b.txt']);
  });

  test('fs:unlink', async () => {
    await electron.invoke('fs:unlink', '/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_unlink', { path: '/path' });
  });

  test('fs:access', async () => {
    await electron.invoke('fs:access', '/path');
    expect(invokeMock).toHaveBeenCalledWith('fs_access', { path: '/path' });
  });

  test('fs:mkdir', async () => {
    await electron.invoke('fs:mkdir', '/dir');
    expect(invokeMock).toHaveBeenCalledWith('fs_mkdir', { path: '/dir' });
  });

  test('bw:file-read maps to fs_read_file', async () => {
    invokeMock.mockResolvedValue('file data');
    const result = await electron.invoke('bw:file-read', '/f.txt');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/f.txt' });
    expect(result).toBe('file data');
  });

  test('bwa:file-read maps to fs_read_file', async () => {
    invokeMock.mockResolvedValue('csv data');
    const result = await electron.invoke('bwa:file-read', '/f.csv');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/f.csv' });
    expect(result).toBe('csv data');
  });

  // ── I18n ──────────────────────────────────────────────────────────────

  test('i18n:load', async () => {
    invokeMock.mockResolvedValue('{"hello":"world"}');
    const result = await electron.invoke('i18n:load', 'en');
    expect(invokeMock).toHaveBeenCalledWith('i18n_load', { lang: 'en' });
    expect(result).toBe('{"hello":"world"}');
  });

  // ── Settings ──────────────────────────────────────────────────────────

  test('settings:save', async () => {
    invokeMock.mockResolvedValue(undefined);
    const result = await electron.invoke('settings:save', { key: 'val' });
    expect(invokeMock).toHaveBeenCalledWith('settings_save', {
      filename: 'settings.json',
      content: JSON.stringify({ key: 'val' })
    });
    expect(result).toBe('SAVED');
  });

  test('config:delete', async () => {
    await electron.invoke('config:delete', 'old-config.json');
    expect(invokeMock).toHaveBeenCalledWith('config_delete', { filename: 'old-config.json' });
  });

  test('config:export', async () => {
    invokeMock.mockResolvedValue('{"exported":true}');
    const result = await electron.invoke('config:export');
    expect(invokeMock).toHaveBeenCalledWith('config_export');
    expect(result).toBe('{"exported":true}');
  });

  test('config:import opens dialog and imports', async () => {
    openMock.mockResolvedValue('/config.json');
    invokeMock.mockResolvedValueOnce('{"settings":"data"}'); // fs_read_file
    invokeMock.mockResolvedValueOnce(undefined); // config_import
    await electron.invoke('config:import');
    expect(openMock).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/config.json' });
    expect(invokeMock).toHaveBeenCalledWith('config_import', { content: '{"settings":"data"}' });
  });

  test('config:import returns undefined when dialog cancelled', async () => {
    openMock.mockResolvedValue(null);
    const result = await electron.invoke('config:import');
    expect(result).toBeUndefined();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  // ── Profiles ──────────────────────────────────────────────────────────

  test('profiles:list', async () => {
    invokeMock.mockResolvedValue([{ id: 'default' }]);
    const result = await electron.invoke('profiles:list');
    expect(invokeMock).toHaveBeenCalledWith('profiles_list');
    expect(result).toEqual([{ id: 'default' }]);
  });

  test('profiles:create', async () => {
    invokeMock.mockResolvedValue({ id: 'new' });
    await electron.invoke('profiles:create', 'new', true);
    expect(invokeMock).toHaveBeenCalledWith('profiles_create', { name: 'new', copyCurrent: true });
  });

  test('profiles:rename', async () => {
    await electron.invoke('profiles:rename', 'old', 'new');
    expect(invokeMock).toHaveBeenCalledWith('profiles_rename', { id: 'old', newName: 'new' });
  });

  test('profiles:delete', async () => {
    await electron.invoke('profiles:delete', 'myprofile');
    expect(invokeMock).toHaveBeenCalledWith('profiles_delete', { id: 'myprofile' });
  });

  test('profiles:set-current', async () => {
    await electron.invoke('profiles:set-current', 'work');
    expect(invokeMock).toHaveBeenCalledWith('profiles_set_current', { id: 'work' });
  });

  test('profiles:export', async () => {
    invokeMock.mockResolvedValue('/path/to/export.zip');
    await electron.invoke('profiles:export', 'myprofile');
    expect(invokeMock).toHaveBeenCalledWith('profiles_export', { id: 'myprofile' });
  });

  test('profiles:import opens dialog', async () => {
    openMock.mockResolvedValue('/profiles/work.zip');
    const result = await electron.invoke('profiles:import');
    expect(openMock).toHaveBeenCalled();
    expect(result.id).toBe('work');
  });

  test('profiles:import returns undefined when cancelled', async () => {
    openMock.mockResolvedValue(null);
    const result = await electron.invoke('profiles:import');
    expect(result).toBeUndefined();
  });

  // ── DB Merge ──────────────────────────────────────────────────────────

  test('db:pick-files opens dialog for SQLite/JSON', async () => {
    openMock.mockResolvedValue(['/data.sqlite']);
    const result = await electron.invoke('db:pick-files');
    expect(openMock).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true })
    );
    expect(result).toEqual(['/data.sqlite']);
  });

  test('history:merge', async () => {
    await electron.invoke('history:merge', ['/a.sqlite', '/b.sqlite']);
    expect(invokeMock).toHaveBeenCalledWith('history_merge', { paths: ['/a.sqlite', '/b.sqlite'] });
  });

  test('cache:merge', async () => {
    await electron.invoke('cache:merge', ['/c.sqlite']);
    expect(invokeMock).toHaveBeenCalledWith('cache_merge', { paths: ['/c.sqlite'] });
  });

  // ── History ───────────────────────────────────────────────────────────

  test('history:get', async () => {
    invokeMock.mockResolvedValue([{ domain: 'a.com' }]);
    const result = await electron.invoke('history:get', 100);
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_get', { limit: 100 });
    expect(result).toEqual([{ domain: 'a.com' }]);
  });

  test('history:get defaults to 50', async () => {
    invokeMock.mockResolvedValue([]);
    await electron.invoke('history:get');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_get', { limit: 50 });
  });

  test('history:clear', async () => {
    await electron.invoke('history:clear');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_history_clear');
  });

  test('history:mode returns tauri', async () => {
    const result = await electron.invoke('history:mode');
    expect(result).toBe('tauri');
  });

  // ── Cache (renderer-level) ────────────────────────────────────────────

  test('cache:get composes key and passes ttl', async () => {
    invokeMock.mockResolvedValue('cached-data');
    const result = await electron.invoke('cache:get', 'ns', 'key', { ttl: 60 });
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', { key: 'ns:key', ttlMs: 60000 });
    expect(result).toBe('cached-data');
  });

  test('cache:get passes null ttl when not provided', async () => {
    invokeMock.mockResolvedValue(null);
    await electron.invoke('cache:get', 'ns', 'key');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_get', { key: 'ns:key', ttlMs: null });
  });

  test('cache:set composes key', async () => {
    await electron.invoke('cache:set', 'ns', 'key', 'data');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_set', {
      key: 'ns:key',
      response: 'data',
      maxEntries: 1000
    });
  });

  test('cache:clear', async () => {
    await electron.invoke('cache:clear');
    expect(invokeMock).toHaveBeenCalledWith('db_gui_cache_clear');
  });

  // ── Stats ─────────────────────────────────────────────────────────────

  test('stats:start', async () => {
    invokeMock.mockResolvedValue(1);
    const result = await electron.invoke('stats:start', '/cfg', '/data');
    expect(invokeMock).toHaveBeenCalledWith('stats_start', { configPath: '/cfg', dataPath: '/data' });
    expect(result).toBe(1);
  });

  test('stats:refresh', async () => {
    await electron.invoke('stats:refresh', 42);
    expect(invokeMock).toHaveBeenCalledWith('stats_refresh', { id: 42 });
  });

  test('stats:stop', async () => {
    await electron.invoke('stats:stop', 42);
    expect(invokeMock).toHaveBeenCalledWith('stats_stop', { id: 42 });
  });

  test('stats:get', async () => {
    invokeMock.mockResolvedValue({ size: 100 });
    const result = await electron.invoke('stats:get', '/cfg', '/data');
    expect(invokeMock).toHaveBeenCalledWith('stats_get', { configPath: '/cfg', dataPath: '/data' });
    expect(result).toEqual({ size: 100 });
  });

  // ── Monitor ───────────────────────────────────────────────────────────

  test('monitor:start', async () => {
    await electron.invoke('monitor:start');
    expect(invokeMock).toHaveBeenCalledWith('monitor_start');
  });

  test('monitor:stop', async () => {
    await electron.invoke('monitor:stop');
    expect(invokeMock).toHaveBeenCalledWith('monitor_stop');
  });

  test('monitor:lookup', async () => {
    await electron.invoke('monitor:lookup', 'example.com');
    expect(invokeMock).toHaveBeenCalledWith('monitor_lookup', { domain: 'example.com' });
  });

  // ── Shell / App ───────────────────────────────────────────────────────

  test('app:open-data-dir opens shell after getting path', async () => {
    invokeMock.mockResolvedValueOnce('/user/data'); // app_get_user_data_path
    invokeMock.mockResolvedValueOnce(undefined); // shell_open_path
    await electron.invoke('app:open-data-dir');
    expect(invokeMock).toHaveBeenCalledWith('app_get_user_data_path');
    expect(invokeMock).toHaveBeenCalledWith('shell_open_path', { path: '/user/data' });
  });

  test('app:get-base-dir', async () => {
    invokeMock.mockResolvedValue('/base/dir');
    const result = await electron.invoke('app:get-base-dir');
    expect(invokeMock).toHaveBeenCalledWith('app_get_base_dir');
    expect(result).toBe('/base/dir');
  });

  test('app:get-user-data-path', async () => {
    invokeMock.mockResolvedValue('/user/data');
    const result = await electron.invoke('app:get-user-data-path');
    expect(invokeMock).toHaveBeenCalledWith('app_get_user_data_path');
    expect(result).toBe('/user/data');
  });

  test('app:minimize calls window minimize', async () => {
    await electron.invoke('app:minimize');
    expect(minimizeMock).toHaveBeenCalled();
  });

  test('app:maximize calls window toggleMaximize', async () => {
    await electron.invoke('app:maximize');
    expect(toggleMaximizeMock).toHaveBeenCalled();
  });

  test('app:close calls window close', async () => {
    await electron.invoke('app:close');
    expect(closeMock).toHaveBeenCalled();
  });

  test('app:reload invokes without error', async () => {
    // jsdom locks window.location as non-configurable & read-only, so we
    // cannot spy on reload(). Instead verify the invoke path doesn't throw.
    // The underlying call is simply `window.location.reload()`.
    await expect(electron.invoke('app:reload')).resolves.not.toThrow();
  });

  test('app:toggleDevtools is a noop', async () => {
    const result = await electron.invoke('app:toggleDevtools');
    expect(result).toBeUndefined();
  });

  // ── DNS / RDAP ────────────────────────────────────────────────────────

  test('dns:lookup', async () => {
    invokeMock.mockResolvedValue(true);
    const result = await electron.invoke('dns:lookup', 'example.com');
    expect(invokeMock).toHaveBeenCalledWith('dns_lookup_cmd', { domain: 'example.com' });
    expect(result).toBe(true);
  });

  test('rdap:lookup', async () => {
    invokeMock.mockResolvedValue('{"rdap":"data"}');
    const result = await electron.invoke('rdap:lookup', 'example.com');
    expect(invokeMock).toHaveBeenCalledWith('rdap_lookup_cmd', { domain: 'example.com' });
    expect(result).toBe('{"rdap":"data"}');
  });

  // ── Path helpers ──────────────────────────────────────────────────────

  test('path:join joins path segments', async () => {
    const result = await electron.invoke('path:join', 'a', 'b', 'c.txt');
    expect(result).toBe('a\\b\\c.txt');
  });

  test('path:basename returns filename', async () => {
    const result = await electron.invoke('path:basename', 'a\\b\\file.txt');
    expect(result).toBe('file.txt');
  });
});

// ── send() tests ────────────────────────────────────────────────────────────

describe('Tauri Shim — send()', () => {
  test('singlewhois:openlink invokes shell_open_path', () => {
    electron.send('singlewhois:openlink', 'https://example.com');
    expect(invokeMock).toHaveBeenCalledWith('shell_open_path', { path: 'https://example.com' });
  });

  test('app:exit-confirmed calls window close', () => {
    electron.send('app:exit-confirmed');
    expect(closeMock).toHaveBeenCalled();
  });

  test('app:debug logs without error', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    electron.send('app:debug', 'test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('app:error logs without error', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    electron.send('app:error', 'test error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('unknown send channel logs', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    electron.send('unknown:channel', 'data');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── on() / off() tests ─────────────────────────────────────────────────────

describe('Tauri Shim — on()/off()', () => {
  test('on registers a listener via Tauri listen', async () => {
    const handler = jest.fn();
    await electron.on('stats:update', handler);
    expect(listenMock).toHaveBeenCalledWith('stats:update', expect.any(Function));
  });

  test('on registers bulk:status listener for bulkwhois:status.update', async () => {
    const handler = jest.fn();
    await electron.on('bulkwhois:status.update', handler);
    expect(listenMock).toHaveBeenCalledWith('bulk:status', expect.any(Function));
  });

  test('on registers bulk:result listener for bulkwhois:result.receive', async () => {
    const handler = jest.fn();
    await electron.on('bulkwhois:result.receive', handler);
    expect(listenMock).toHaveBeenCalledWith('bulk:result', expect.any(Function));
  });

  test('on handles monitor:update', async () => {
    const handler = jest.fn();
    await electron.on('monitor:update', handler);
    expect(listenMock).toHaveBeenCalledWith('monitor:update', expect.any(Function));
  });

  test('on handles monitor:heartbeat', async () => {
    const handler = jest.fn();
    await electron.on('monitor:heartbeat', handler);
    expect(listenMock).toHaveBeenCalledWith('monitor:heartbeat', expect.any(Function));
  });

  test('on handles settings:reloaded', async () => {
    const handler = jest.fn();
    await electron.on('settings:reloaded', handler);
    expect(listenMock).toHaveBeenCalledWith('settings:reloaded', expect.any(Function));
  });

  test('on handles unknown channel via generic listen', async () => {
    const handler = jest.fn();
    await electron.on('custom:event', handler);
    expect(listenMock).toHaveBeenCalledWith('custom:event', expect.any(Function));
  });

  test('off unsubscribes a previously registered listener', async () => {
    const unlistenFn = jest.fn();
    listenMock.mockResolvedValue(unlistenFn);

    await electron.on('stats:update', jest.fn());
    electron.off('stats:update');

    expect(unlistenFn).toHaveBeenCalled();
  });

  test('off is safe to call for unregistered channel', () => {
    expect(() => electron.off('never-registered')).not.toThrow();
  });
});

// ── Convenience helpers tests ───────────────────────────────────────────────

describe('Tauri Shim — convenience helpers', () => {
  test('electron.readFile calls fs_read_file', async () => {
    invokeMock.mockResolvedValue('contents');
    const result = await electron.readFile('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/file' });
    expect(result).toBe('contents');
  });

  test('electron.writeFile calls fs_write_file', async () => {
    await electron.writeFile('/file', 'data');
    expect(invokeMock).toHaveBeenCalledWith('fs_write_file', { path: '/file', content: 'data' });
  });

  test('electron.stat calls fs_stat', async () => {
    invokeMock.mockResolvedValue({ size: 42 });
    const result = await electron.stat('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_stat', { path: '/file' });
    expect(result).toEqual({ size: 42 });
  });

  test('electron.readdir calls fs_readdir', async () => {
    invokeMock.mockResolvedValue(['a', 'b']);
    const result = await electron.readdir('/dir');
    expect(invokeMock).toHaveBeenCalledWith('fs_readdir', { path: '/dir' });
    expect(result).toEqual(['a', 'b']);
  });

  test('electron.unlink calls fs_unlink', async () => {
    await electron.unlink('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_unlink', { path: '/file' });
  });

  test('electron.access calls fs_access', async () => {
    await electron.access('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_access', { path: '/file' });
  });

  test('electron.exists calls fs_exists', async () => {
    invokeMock.mockResolvedValue(true);
    const result = await electron.exists('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_exists', { path: '/file' });
    expect(result).toBe(true);
  });

  test('electron.bwFileRead calls fs_read_file', async () => {
    invokeMock.mockResolvedValue('data');
    await electron.bwFileRead('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/file' });
  });

  test('electron.bwaFileRead calls fs_read_file', async () => {
    invokeMock.mockResolvedValue('data');
    await electron.bwaFileRead('/file');
    expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: '/file' });
  });

  test('electron.loadTranslations calls i18n_load', async () => {
    invokeMock.mockResolvedValue('{}');
    await electron.loadTranslations('pt');
    expect(invokeMock).toHaveBeenCalledWith('i18n_load', { lang: 'pt' });
  });

  test('electron.startStats', async () => {
    invokeMock.mockResolvedValue(1);
    const result = await electron.startStats('/cfg', '/dir');
    expect(invokeMock).toHaveBeenCalledWith('stats_start', { configPath: '/cfg', dataPath: '/dir' });
    expect(result).toBe(1);
  });

  test('electron.refreshStats', async () => {
    await electron.refreshStats(5);
    expect(invokeMock).toHaveBeenCalledWith('stats_refresh', { id: 5 });
  });

  test('electron.stopStats', async () => {
    await electron.stopStats(5);
    expect(invokeMock).toHaveBeenCalledWith('stats_stop', { id: 5 });
  });

  test('electron.getStats', async () => {
    invokeMock.mockResolvedValue({ size: 100 });
    const result = await electron.getStats('/cfg', '/dir');
    expect(invokeMock).toHaveBeenCalledWith('stats_get', { configPath: '/cfg', dataPath: '/dir' });
    expect(result).toEqual({ size: 100 });
  });

  test('electron.getBaseDir', async () => {
    invokeMock.mockResolvedValue('/base');
    const result = await electron.getBaseDir();
    expect(invokeMock).toHaveBeenCalledWith('app_get_base_dir');
    expect(result).toBe('/base');
  });

  test('electron.openDataDir', async () => {
    invokeMock.mockResolvedValueOnce('/data');
    invokeMock.mockResolvedValueOnce(undefined);
    await electron.openDataDir();
    expect(invokeMock).toHaveBeenCalledWith('app_get_user_data_path');
    expect(invokeMock).toHaveBeenCalledWith('shell_open_path', { path: '/data' });
  });

  test('electron.watch returns stub with close()', async () => {
    const w = await electron.watch('/path');
    expect(w).toHaveProperty('close');
    expect(typeof w.close).toBe('function');
    expect(() => w.close()).not.toThrow();
  });

  test('electron.path.join', () => {
    expect(electron.path.join('a', 'b', 'c')).toBe('a\\b\\c');
  });

  test('electron.path.join handles slashes', () => {
    expect(electron.path.join('a/', '/b', 'c')).toBe('a\\b\\c');
  });

  test('electron.path.basename', () => {
    expect(electron.path.basename('a/b/file.txt')).toBe('file.txt');
  });

  test('electron.path.basename with backslashes', () => {
    expect(electron.path.basename('a\\b\\file.txt')).toBe('file.txt');
  });

  test('electron.path.basename returns empty for empty', () => {
    expect(electron.path.basename('')).toBe('');
  });
});

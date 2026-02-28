/**
 * Tauri Bridge — typed TypeScript module replacing the legacy tauri-shim.js.
 *
 * All renderer code should import from this module instead of accessing
 * `window.electron`. This provides properly typed wrappers around
 * `window.__TAURI__` APIs (invoke, listen, dialog, window).
 *
 * @module tauriBridge
 */

import type DomainStatus from './status.js';
import type { WhoisResult } from './availability.js';
import type { ProcessOptions } from './tools.js';
import type { BulkWhoisResults } from './bulkwhois/types.js';
import type { ExportOptions } from './bulkwhois/export-helpers.js';
import type { FileStats } from './fileStats.js';
import type { IpcChannel } from './ipcChannels.js';

// ─── Tauri Runtime Type Declarations ────────────────────────────────────────

interface TauriEvent<T = unknown> {
  payload: T;
}

interface TauriDialogFilter {
  name: string;
  extensions: string[];
}

interface TauriOpenOptions {
  multiple?: boolean;
  filters?: TauriDialogFilter[];
}

interface TauriSaveOptions {
  title?: string;
  filters?: TauriDialogFilter[];
}

interface TauriWindow {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
}

interface TauriGlobal {
  core: {
    invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  };
  event: {
    listen<T = unknown>(
      event: string,
      handler: (event: TauriEvent<T>) => void
    ): Promise<() => void>;
  };
  dialog: {
    open(options?: TauriOpenOptions): Promise<string | string[] | null>;
    save(options?: TauriSaveOptions): Promise<string | null>;
  };
  window: {
    getCurrentWindow(): TauriWindow;
  };
}

declare global {
  interface Window {
    __TAURI__: TauriGlobal;
  }
}

// ─── Core Helpers ───────────────────────────────────────────────────────────

const tauriCore = () => window.__TAURI__.core;
const tauriEvent = () => window.__TAURI__.event;
const tauriDialog = () => window.__TAURI__.dialog;
const tauriWindow = () => window.__TAURI__.window;

function tauriInvoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return tauriCore().invoke<T>(cmd, args);
}

// ─── Event Listener Management ──────────────────────────────────────────────

const _unlisteners: Record<string, () => void> = {};

/**
 * Listen for a Tauri event from the backend.
 * Only one listener per event name is tracked (subsequent calls replace the
 * previous registration). Returns the unlisten function.
 */
export async function listen<T = unknown>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  // Remove existing listener for this event, if any
  _unlisteners[event]?.();

  const unlisten = await tauriEvent().listen<T>(event, (ev) => handler(ev.payload));
  _unlisteners[event] = unlisten;
  return unlisten;
}

/**
 * Remove a previously registered event listener.
 */
export function unlisten(event: string): void {
  _unlisteners[event]?.();
  delete _unlisteners[event];
}

// ─── WHOIS Commands ─────────────────────────────────────────────────────────

export function whoisLookup(domain: string): Promise<string> {
  return tauriInvoke<string>('whois_lookup', { domain });
}

export function dnsLookup(domain: string): Promise<boolean> {
  return tauriInvoke<boolean>('dns_lookup_cmd', { domain });
}

export function rdapLookup(domain: string): Promise<string> {
  return tauriInvoke<string>('rdap_lookup_cmd', { domain });
}

export function availabilityCheck(text: string): Promise<DomainStatus> {
  return tauriInvoke<DomainStatus>('availability_check', { text });
}

export function domainParameters(
  domain: string | null,
  status: DomainStatus | null,
  text: string,
  extra?: Record<string, unknown>
): Promise<WhoisResult> {
  return tauriInvoke<WhoisResult>('availability_params', {
    domain: domain ?? null,
    status: status ?? null,
    text,
    ...(extra ? { extra } : {}),
  });
}

// ─── Bulk WHOIS Commands ────────────────────────────────────────────────────

export function bulkWhoisLookup(
  domains: string[],
  tlds?: string[],
  concurrency = 4,
  timeoutMs = 5000
): Promise<void> {
  return tauriInvoke('bulk_whois_lookup', { domains, tlds, concurrency, timeoutMs });
}

export function bulkWhoisPause(): Promise<void> {
  return tauriInvoke('bulk_whois_pause');
}

export function bulkWhoisContinue(): Promise<void> {
  return tauriInvoke('bulk_whois_continue');
}

export function bulkWhoisStop(): Promise<void> {
  return tauriInvoke('bulk_whois_stop');
}

export async function bulkWhoisExport(
  results: BulkWhoisResults,
  options: ExportOptions
): Promise<void> {
  const filePath = await tauriDialog().save({
    title: 'Save export file',
    filters:
      options.filetype === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });
  if (!filePath) return;
  return tauriInvoke('bulk_whois_export', { results, options, path: filePath });
}

// ─── BWA (Bulk Whois Analyser) ─────────────────────────────────────────────

export function bwaAnalyserStart(data: unknown): Promise<unknown> {
  return tauriInvoke('bwa_analyser_start', { data });
}

// ─── Text Operations ────────────────────────────────────────────────────────

export function toProcess(content: string, options: ProcessOptions): Promise<string> {
  return tauriInvoke<string>('to_process', { content, options });
}

// ─── CSV ────────────────────────────────────────────────────────────────────

export function parseCsv(content: string): Promise<unknown> {
  return tauriInvoke('csv_parse', { content });
}

// ─── Availability / Domain Parameters ───────────────────────────────────────
// (Covered above in WHOIS Commands)

// ─── File Dialogs ───────────────────────────────────────────────────────────

export function openFileDialog(
  options?: TauriOpenOptions
): Promise<string | string[] | null> {
  return tauriDialog().open(options);
}

export function saveFileDialog(
  options?: TauriSaveOptions
): Promise<string | null> {
  return tauriDialog().save(options);
}

/** Opens a file picker for text/list/csv files. */
export function openTextFileDialog(): Promise<string | string[] | null> {
  return openFileDialog({
    multiple: true,
    filters: [{ name: 'Text / List', extensions: ['txt', 'list', 'csv'] }],
  });
}

/** Opens a file picker for CSV/JSON files (BWA). */
export function openCsvJsonDialog(): Promise<string | string[] | null> {
  return openFileDialog({
    multiple: true,
    filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }],
  });
}

/** Opens a file picker for SQLite/JSON database files. */
export function openDbFileDialog(): Promise<string[] | null> {
  return openFileDialog({
    multiple: true,
    filters: [{ name: 'SQLite / JSON', extensions: ['sqlite', 'db', 'sqlite3', 'json'] }],
  }) as Promise<string[] | null>;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function settingsLoad(): Promise<{ settings: Record<string, unknown>; userDataPath: string }> {
  const userDataPath = await tauriInvoke<string>('app_get_user_data_path');
  const settingsJson = await tauriInvoke<string>('settings_load', { filename: 'settings.json' });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(settingsJson) as Record<string, unknown>;
  } catch {
    /* use empty */
  }
  return { settings: parsed, userDataPath };
}

export function settingsSave(settingsObj: unknown): Promise<string> {
  return tauriInvoke<string>('settings_save', {
    filename: 'settings.json',
    content: JSON.stringify(settingsObj),
  }).then(() => 'SAVED');
}

export function configDelete(filename: string): Promise<void> {
  return tauriInvoke('config_delete', { filename });
}

export async function configExport(): Promise<string> {
  return tauriInvoke<string>('config_export');
}

export async function configImport(): Promise<void> {
  const files = await tauriDialog().open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!files) return;
  const filePath = Array.isArray(files) ? files[0] : files;
  const content = await tauriInvoke<string>('fs_read_file', { path: filePath });
  await tauriInvoke('config_import', { content });
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export interface ProfileEntry {
  id: string;
  name: string;
  file: string;
  mtime?: number;
}

export function profilesList(): Promise<ProfileEntry[]> {
  return tauriInvoke<ProfileEntry[]>('profiles_list');
}

export function profilesCreate(name: string, copyCurrent = false): Promise<{ id: string }> {
  return tauriInvoke<{ id: string }>('profiles_create', { name, copyCurrent });
}

export function profilesRename(id: string, newName: string): Promise<void> {
  return tauriInvoke('profiles_rename', { id, newName });
}

export function profilesDelete(id: string): Promise<void> {
  return tauriInvoke('profiles_delete', { id });
}

export function profilesSetCurrent(id: string): Promise<void> {
  return tauriInvoke('profiles_set_current', { id });
}

export function profilesExport(id?: string): Promise<string> {
  return tauriInvoke<string>('profiles_export', { id: id ?? null });
}

export async function profilesImport(): Promise<{ id: string } | undefined> {
  const zipFiles = await tauriDialog().open({
    multiple: false,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  });
  if (!zipFiles) return undefined;
  const chosen = Array.isArray(zipFiles) ? zipFiles[0] : zipFiles;
  return { id: path.basename(chosen).replace('.zip', '') };
}

// ─── History ────────────────────────────────────────────────────────────────

export function historyGet(limit = 50): Promise<unknown[]> {
  return tauriInvoke<unknown[]>('db_gui_history_get', { limit });
}

export function historyClear(): Promise<void> {
  return tauriInvoke('db_gui_history_clear');
}

export function historyMerge(paths: string[]): Promise<void> {
  return tauriInvoke('history_merge', { paths });
}

// ─── Cache ──────────────────────────────────────────────────────────────────

export function cacheGet(
  type: string,
  domain: string,
  opts?: { ttl?: number }
): Promise<string | undefined> {
  const key = `${type}:${domain}`;
  const ttlMs = opts?.ttl ? opts.ttl * 1000 : null;
  return tauriInvoke<string | undefined>('db_gui_cache_get', { key, ttlMs });
}

export function cacheSet(
  type: string,
  domain: string,
  response: string,
  _opts?: { ttl?: number }
): Promise<void> {
  const key = `${type}:${domain}`;
  return tauriInvoke('db_gui_cache_set', { key, response, maxEntries: 1000 });
}

export function cacheClear(): Promise<void> {
  return tauriInvoke('db_gui_cache_clear');
}

export function cacheMerge(paths: string[]): Promise<void> {
  return tauriInvoke('cache_merge', { paths });
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export function statsStart(configPath: string, dataPath: string): Promise<number> {
  return tauriInvoke<number>('stats_start', { configPath, dataPath });
}

export function statsRefresh(id: number): Promise<void> {
  return tauriInvoke('stats_refresh', { id });
}

export function statsStop(id: number): Promise<void> {
  return tauriInvoke('stats_stop', { id });
}

export function statsGet(configPath: string, dataPath: string): Promise<unknown> {
  return tauriInvoke('stats_get', { configPath, dataPath });
}

// ─── Monitor ────────────────────────────────────────────────────────────────

export function monitorStart(): Promise<void> {
  return tauriInvoke('monitor_start');
}

export function monitorStop(): Promise<void> {
  return tauriInvoke('monitor_stop');
}

export function monitorLookup(domain: string): Promise<unknown> {
  return tauriInvoke('monitor_lookup', { domain });
}

// ─── DB Merge ───────────────────────────────────────────────────────────────

// (historyMerge and cacheMerge are above)

// ─── File System ────────────────────────────────────────────────────────────

export namespace fs {
  export function readFile(filePath: string): Promise<string> {
    return tauriInvoke<string>('fs_read_file', { path: filePath });
  }

  export function writeFile(filePath: string, content: string): Promise<void> {
    return tauriInvoke('fs_write_file', { path: filePath, content });
  }

  export function exists(filePath: string): Promise<boolean> {
    return tauriInvoke<boolean>('fs_exists', { path: filePath });
  }

  export function stat(filePath: string): Promise<FileStats> {
    return tauriInvoke<FileStats>('fs_stat', { path: filePath });
  }

  export function readdir(dirPath: string): Promise<string[]> {
    return tauriInvoke<string[]>('fs_readdir', { path: dirPath });
  }

  export function unlink(filePath: string): Promise<void> {
    return tauriInvoke('fs_unlink', { path: filePath });
  }

  export function access(filePath: string): Promise<void> {
    return tauriInvoke('fs_access', { path: filePath });
  }

  export function mkdir(dirPath: string): Promise<void> {
    return tauriInvoke('fs_mkdir', { path: dirPath });
  }
}

// ─── Path Helpers ───────────────────────────────────────────────────────────

export namespace path {
  /** Join path segments using the platform path separator. */
  export function join(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/[/\\]+/g, '/');
  }

  /** Return the trailing file/folder name from a path string. */
  export function basename(p: string): string {
    return (p || '').split(/[/\\]/).filter(Boolean).pop() || '';
  }
}

// ─── App / Window ───────────────────────────────────────────────────────────

export namespace app {
  export function getBaseDir(): Promise<string> {
    return tauriInvoke<string>('app_get_base_dir');
  }

  export function getUserDataPath(): Promise<string> {
    return tauriInvoke<string>('app_get_user_data_path');
  }

  export async function openDataDir(): Promise<void> {
    const udp = await getUserDataPath();
    await tauriInvoke('shell_open_path', { path: udp });
  }

  export function openPath(pathStr: string): Promise<string> {
    return tauriInvoke<string>('shell_open_path', { path: pathStr });
  }

  export function minimize(): Promise<void> {
    return tauriWindow().getCurrentWindow().minimize();
  }

  export function toggleMaximize(): Promise<void> {
    return tauriWindow().getCurrentWindow().toggleMaximize();
  }

  export function close(): Promise<void> {
    return tauriWindow().getCurrentWindow().close();
  }

  export function reload(): void {
    window.location.reload();
  }

  export function toggleDevtools(): void {
    // Dev-tools toggle is handled by OS shortcut in Tauri (Cmd+Shift+I / F12)
  }
}

// ─── I18n ───────────────────────────────────────────────────────────────────

export function i18nLoad(lang: string): Promise<string> {
  return tauriInvoke<string>('i18n_load', { lang });
}

// ─── AI ─────────────────────────────────────────────────────────────────────

export function aiSuggest(prompt: string, count: number): Promise<string[]> {
  return tauriInvoke<string[]>('ai_suggest', { prompt, count });
}

export function aiDownloadModel(): Promise<void> {
  return tauriInvoke('ai_download_model');
}

// ─── File Watcher Stub ──────────────────────────────────────────────────────

/**
 * Stub for the Electron-style fs.watch API.
 * Tauri doesn't expose fs.watch directly in the renderer.
 */
export async function watch(): Promise<{ close: () => void }> {
  return { close: () => {} };
}

// ─── Legacy IPC-Compatible API ──────────────────────────────────────────────
//
// These functions provide backward compatibility with the `window.electron`
// pattern used by legacy code during migration. Prefer using the typed
// functions above in new code.

// Channel-to-Tauri-command mapping for invoke()
async function legacyInvoke(channel: IpcChannel | string, ...args: unknown[]): Promise<unknown> {
  switch (channel) {
    // WHOIS
    case 'singlewhois:lookup':
      return whoisLookup(args[0] as string);
    case 'dns:lookup':
      return dnsLookup(args[0] as string);
    case 'rdap:lookup':
      return rdapLookup(args[0] as string);
    case 'availability:check':
      return availabilityCheck(args[0] as string);
    case 'availability:params':
      return domainParameters(
        args[0] as string | null,
        args[1] as DomainStatus | null,
        args[2] as string,
        args[3] as Record<string, unknown> | undefined
      );

    // Bulk WHOIS
    case 'bulkwhois:lookup':
      return bulkWhoisLookup(args[0] as string[], args[1] as string[]);
    case 'bulkwhois:lookup.pause':
      return bulkWhoisPause();
    case 'bulkwhois:lookup.continue':
      return bulkWhoisContinue();
    case 'bulkwhois:lookup.stop':
      return bulkWhoisStop();
    case 'bulkwhois:input.file':
      return openTextFileDialog();
    case 'bulkwhois:input.wordlist':
      return;
    case 'bulkwhois:export':
      return bulkWhoisExport(args[0] as BulkWhoisResults, args[1] as ExportOptions);
    case 'bulkwhois:export.cancel':
      return;

    // BWA
    case 'bwa:input.file':
      return openCsvJsonDialog();
    case 'bwa:analyser.start':
      return bwaAnalyserStart(args[0]);

    // Text Operations
    case 'to:input.file':
      return openFileDialog({
        multiple: false,
        filters: [{ name: 'Text', extensions: ['txt', 'list', 'csv'] }],
      });
    case 'to:process':
      return toProcess(args[0] as string, args[1] as ProcessOptions);

    // CSV
    case 'csv:parse':
      return parseCsv(args[0] as string);

    // FS
    case 'fs:readFile':
    case 'bw:file-read':
    case 'bwa:file-read':
      return fs.readFile(args[0] as string);
    case 'fs:writeFile':
      return fs.writeFile(args[0] as string, args[1] as string);
    case 'fs:exists':
      return fs.exists(args[0] as string);
    case 'fs:stat':
      return fs.stat(args[0] as string);
    case 'fs:readdir':
      return fs.readdir(args[0] as string);
    case 'fs:unlink':
      return fs.unlink(args[0] as string);
    case 'fs:access':
      return fs.access(args[0] as string);
    case 'fs:mkdir':
      return fs.mkdir(args[0] as string);

    // I18n
    case 'i18n:load':
      return i18nLoad(args[0] as string);

    // Settings
    case 'settings:load':
      return settingsLoad();
    case 'settings:save':
      return settingsSave(args[0]);
    case 'config:delete':
      return configDelete(args[0] as string);
    case 'config:export':
      return configExport();
    case 'config:import':
      return configImport();

    // Profiles
    case 'profiles:list':
      return profilesList();
    case 'profiles:create':
      return profilesCreate(args[0] as string, args[1] as boolean | undefined);
    case 'profiles:rename':
      return profilesRename(args[0] as string, args[1] as string);
    case 'profiles:delete':
      return profilesDelete(args[0] as string);
    case 'profiles:set-current':
      return profilesSetCurrent(args[0] as string);
    case 'profiles:export':
      return profilesExport(args[0] as string | undefined);
    case 'profiles:import':
      return profilesImport();

    // DB Merge
    case 'db:pick-files':
      return openDbFileDialog();
    case 'history:merge':
      return historyMerge(args[0] as string[]);
    case 'cache:merge':
      return cacheMerge(args[0] as string[]);

    // History
    case 'history:get':
      return historyGet((args[0] as number) || 50);
    case 'history:clear':
      return historyClear();
    case 'history:mode':
      return 'tauri';

    // Cache
    case 'cache:get': {
      const cacheOpts = args[2] as { ttl?: number } | undefined;
      return cacheGet(args[0] as string, args[1] as string, cacheOpts);
    }
    case 'cache:set':
      return cacheSet(args[0] as string, args[1] as string, args[2] as string);
    case 'cache:clear':
      return cacheClear();

    // Stats
    case 'stats:start':
      return statsStart(args[0] as string, args[1] as string);
    case 'stats:refresh':
      return statsRefresh(args[0] as number);
    case 'stats:stop':
      return statsStop(args[0] as number);
    case 'stats:get':
      return statsGet(args[0] as string, args[1] as string);

    // Monitor
    case 'monitor:start':
      return monitorStart();
    case 'monitor:stop':
      return monitorStop();
    case 'monitor:lookup':
      return monitorLookup(args[0] as string);

    // Shell / App
    case 'shell:openPath':
      return app.openPath(args[0] as string);
    case 'app:open-data-dir':
      return app.openDataDir();
    case 'app:get-base-dir':
      return app.getBaseDir();
    case 'app:get-user-data-path':
      return app.getUserDataPath();
    case 'app:minimize':
      return app.minimize();
    case 'app:maximize':
      return app.toggleMaximize();
    case 'app:close':
      return app.close();
    case 'app:reload':
      app.reload();
      return;
    case 'app:toggleDevtools':
      app.toggleDevtools();
      return;

    // DNS / RDAP
    case 'dns:lookup':
      return dnsLookup(args[0] as string);
    case 'rdap:lookup':
      return rdapLookup(args[0] as string);

    // Path helpers
    case 'path:join':
      return path.join(...(args as string[]));
    case 'path:basename':
      return path.basename(args[0] as string);

    // AI
    case 'ai:suggest':
      return aiSuggest(args[0] as string, args[1] as number);
    case 'ai:download-model':
      return aiDownloadModel();

    default:
      console.warn(`[tauriBridge] Unhandled invoke channel: ${channel}`, args);
      return null;
  }
}

// Tauri event name mapping — some Electron channel names differ from the
// Tauri event names emitted by the Rust backend.
const eventNameMap: Record<string, string> = {
  'bulkwhois:status.update': 'bulk:status',
  'bulkwhois:status-update': 'bulk:status',
  'bulkwhois:result.receive': 'bulk:result',
};

async function legacyOn(channel: string, listener: (...args: unknown[]) => void): Promise<void> {
  const tauriEvent = eventNameMap[channel] ?? channel;

  let unlisten: () => void;

  switch (channel) {
    case 'bulkwhois:status.update':
    case 'bulkwhois:status-update':
      unlisten = await tauriEventModule().listen(tauriEvent, (event: TauriEvent<{ sent: number; total: number }>) => {
        listener(null, 'domains.sent', event.payload.sent);
        listener(null, 'domains.total', event.payload.total);
      });
      break;

    case 'bulkwhois:result.receive':
      unlisten = await tauriEventModule().listen(tauriEvent, (event: TauriEvent) => {
        listener(null, event.payload);
      });
      break;

    case 'settings:reloaded':
      unlisten = await tauriEventModule().listen(tauriEvent, (event: TauriEvent) => {
        listener(null, event.payload);
      });
      break;

    case 'monitor:update':
      unlisten = await tauriEventModule().listen(tauriEvent, (event: TauriEvent) => {
        listener(event.payload);
      });
      break;

    default:
      unlisten = await tauriEventModule().listen(tauriEvent, (event: TauriEvent) => {
        listener(event.payload);
      });
      break;
  }

  _unlisteners[channel] = unlisten;
}

function legacyOff(channel: string): void {
  unlisten(channel);
}

function legacySend(channel: string, ...args: unknown[]): void {
  switch (channel) {
    case 'singlewhois:openlink':
      void app.openPath(args[0] as string);
      break;
    case 'app:exit-confirmed':
      void app.close();
      break;
    case 'app:debug':
    case 'app:error':
      console.log(`[${channel}]`, ...args);
      break;
    default:
      console.log(`[tauriBridge] send: ${channel}`, args);
  }
}

function tauriEventModule() {
  return window.__TAURI__.event;
}

/**
 * Legacy-compatible API object — drop-in replacement for `window.electron`.
 * Use only for files that haven't been migrated to direct function imports.
 */
export const legacy = {
  invoke: legacyInvoke,
  send: legacySend,
  on: legacyOn,
  off: legacyOff,
  readFile: fs.readFile,
  writeFile: fs.writeFile,
  stat: fs.stat,
  readdir: fs.readdir,
  unlink: fs.unlink,
  access: fs.access,
  exists: fs.exists,
  bwFileRead: fs.readFile,
  bwaFileRead: fs.readFile,
  loadTranslations: i18nLoad,
  startStats: statsStart,
  refreshStats: statsRefresh,
  stopStats: statsStop,
  getStats: statsGet,
  watch,
  getBaseDir: app.getBaseDir,
  openDataDir: app.openDataDir,
  path: {
    join: (...args: string[]) => path.join(...args),
    basename: (p: string) => path.basename(p),
  },
} as const;

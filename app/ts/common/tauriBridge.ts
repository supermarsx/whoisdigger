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
import type { ProcessOptions } from './tools.js';
import type { BulkWhoisResults } from './bulkwhois/types.js';
import type { ExportOptions } from './bulkwhois/export-helpers.js';
/** Base stat information mirroring Node's fs.Stats / Tauri's fs_stat */
export interface FileStats {
  size: number;
  mtimeMs?: number;
  mtime?: string | Date;
  atime?: string | Date;
  isDirectory?: boolean | (() => boolean);
  isFile?: boolean | (() => boolean);
  filename?: string;
  humansize?: string;
  linecount?: number;
  minestimate?: string;
  maxestimate?: string;
  filepreview?: string;
  errors?: string;
}

// ─── Shared Domain Types ────────────────────────────────────────────────────

/**
 * Result of a WHOIS domain-parameter extraction.
 * This is the canonical type — replaces the one previously defined in availability.ts.
 */
export interface WhoisResult {
  domain?: string;
  status?: DomainStatus;
  registrar?: string;
  company?: string;
  creationDate?: string;
  updateDate?: string;
  expiryDate?: string;
  whoisreply?: string;
  whoisJson?: Record<string, string>;
}

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

export interface LookupSettings {
  general?: {
    timeout?: number;
    follow?: number;
    verbose?: boolean;
    psl?: boolean;
    timeBetween?: number;
  };
  conversion?: {
    algorithm?: string;
    enablePunycode?: boolean;
    enablePsl?: boolean;
    enableCapitalisation?: boolean;
  };
  randomizeFollow?: { randomize: boolean; minimumDepth?: number; maximumDepth?: number };
  randomizeTimeout?: { randomize: boolean; minimum?: number; maximum?: number };
  randomizeTimeBetween?: { randomize: boolean; minimum?: number; maximum?: number };
}

export function whoisLookupWithSettings(domain: string, settings: LookupSettings): Promise<string> {
  return tauriInvoke<string>('whois_lookup_with_settings', { domain, settings });
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

export interface AvailabilitySettings {
  uniregistry?: boolean;
  ratelimit?: boolean;
  unparsable?: boolean;
  expired?: boolean;
  dnsFailureUnavailable?: boolean;
}

export function availabilityCheckWithSettings(
  text: string,
  settings: AvailabilitySettings
): Promise<DomainStatus> {
  return tauriInvoke<DomainStatus>('availability_check_with_settings', { text, settings });
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

/**
 * Parse raw WHOIS text into a key-value JSON map.
 * Backend replacement for the local parser.ts toJSON() function.
 */
export function whoisParse(text: string): Promise<Record<string, string>> {
  return tauriInvoke<Record<string, string>>('whois_parse', { text });
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

/**
 * Bulk WHOIS lookup from a file path — avoids sending multi-MB file content
 * over IPC. Reads, trims, and splits lines server-side via rayon.
 */
export function bulkWhoisLookupFromFile(
  path: string,
  tlds?: string[],
  concurrency = 4,
  timeoutMs = 5000
): Promise<void> {
  return tauriInvoke('bulk_whois_lookup_from_file', {
    path,
    tlds: tlds ?? null,
    concurrency,
    timeoutMs,
  });
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

/** Parse a CSV file directly from path (avoids file content crossing IPC). */
export function csvParseFile(path: string): Promise<unknown> {
  return tauriInvoke('csv_parse_file', { path });
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

export function profilesGetCurrent(): Promise<string> {
  return tauriInvoke<string>('profiles_get_current');
}

export async function profilesImport(): Promise<ProfileEntry | undefined> {
  const zipFiles = await tauriDialog().open({
    multiple: false,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  });
  if (!zipFiles) return undefined;
  const chosen = Array.isArray(zipFiles) ? zipFiles[0] : zipFiles;
  const profileName = path.basename(chosen).replace(/\.zip$/i, '');
  return tauriInvoke<ProfileEntry>('profiles_import', { zipPath: chosen, profileName });
}

// ─── Proxy / Lookup Settings State ──────────────────────────────────────────

export interface ProxySettings {
  enable: boolean;
  mode?: 'single' | 'multi';
  multimode?: 'roundrobin' | 'random' | 'failover';
  single?: string;
  list?: Array<{ host: string; port: number; username?: string; password?: string; protocol?: string }>;
  username?: string;
  password?: string;
  retries?: number;
}

export function proxySetSettings(settings: ProxySettings): Promise<void> {
  return tauriInvoke('proxy_set_settings', { settings });
}

export function proxyGetSettings(): Promise<ProxySettings> {
  return tauriInvoke<ProxySettings>('proxy_get_settings');
}

export function lookupSetSettings(settings: LookupSettings): Promise<void> {
  return tauriInvoke('lookup_set_settings', { settings });
}

export function lookupGetSettings(): Promise<LookupSettings> {
  return tauriInvoke<LookupSettings>('lookup_get_settings');
}

// ─── History ────────────────────────────────────────────────────────────────

export function historyGet(limit = 50): Promise<unknown[]> {
  return tauriInvoke<unknown[]>('db_gui_history_get', { limit });
}

/** Paginated, filtered history result from the backend. */
export interface HistoryPageResult {
  entries: { domain: string; status: string; timestamp: number }[];
  total: number;
  page: number;
  pageSize: number;
}

/** Server-side filtered + paginated history query (SQL-level). */
export function historyGetFiltered(opts?: {
  query?: string;
  status?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}): Promise<HistoryPageResult> {
  return tauriInvoke<HistoryPageResult>('db_gui_history_get_filtered', {
    query: opts?.query ?? null,
    status: opts?.status ?? null,
    days: opts?.days ?? null,
    page: opts?.page ?? 0,
    pageSize: opts?.pageSize ?? 50,
  });
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

// ─── File Info & Conversions ────────────────────────────────────────────────

/** Enriched file metadata returned by the `file_info` backend command. */
export interface FileInfoResult {
  filename: string;
  size: number;
  humanSize: string;
  mtimeMs: number;
  mtimeFormatted: string | null;
  atimeFormatted: string | null;
  lineCount: number;
  filePreview: string;
  minEstimate: string;
  maxEstimate: string | null;
}

/** Time estimates returned by `bulk_estimate_time`. */
export interface TimeEstimateResult {
  min: string;
  max: string | null;
}

/**
 * Retrieve enriched file information including human-readable size,
 * line count, preview, formatted dates, and bulk lookup time estimates.
 */
export function fileInfo(
  filePath: string,
  options?: {
    si?: boolean;
    timeBetween?: number;
    timeBetweenMin?: number;
    timeBetweenMax?: number;
    randomize?: boolean;
  }
): Promise<FileInfoResult> {
  return tauriInvoke<FileInfoResult>('file_info', {
    path: filePath,
    si: options?.si ?? true,
    timeBetween: options?.timeBetween ?? null,
    timeBetweenMin: options?.timeBetweenMin ?? null,
    timeBetweenMax: options?.timeBetweenMax ?? null,
    randomize: options?.randomize ?? null,
  });
}

/** Get time estimates for a given line count and lookup timing settings. */
export function bulkEstimateTime(
  lineCount: number,
  options?: {
    timeBetween?: number;
    timeBetweenMin?: number;
    timeBetweenMax?: number;
    randomize?: boolean;
  }
): Promise<TimeEstimateResult> {
  return tauriInvoke<TimeEstimateResult>('bulk_estimate_time', {
    lineCount,
    timeBetween: options?.timeBetween ?? null,
    timeBetweenMin: options?.timeBetweenMin ?? null,
    timeBetweenMax: options?.timeBetweenMax ?? null,
    randomize: options?.randomize ?? null,
  });
}

/** Convert bytes to a human-readable file size string. */
export function convertFileSize(bytes: number, si = true): Promise<string> {
  return tauriInvoke<string>('convert_file_size', { bytes, si });
}

/** Convert milliseconds to a human-readable duration string. */
export function convertDuration(durationMs: number): Promise<string> {
  return tauriInvoke<string>('convert_duration', { durationMs });
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

export function aiSuggestWithSettings(
  prompt: string,
  count: number,
  url?: string,
  apiKey?: string,
  model?: string
): Promise<string[]> {
  return tauriInvoke<string[]>('ai_suggest_with_settings', {
    prompt,
    count,
    url: url ?? null,
    apiKey: apiKey ?? null,
    model: model ?? null,
  });
}

export function aiDownloadModel(): Promise<void> {
  return tauriInvoke('ai_download_model');
}

export function aiPredict(text: string): Promise<string> {
  return tauriInvoke<string>('ai_predict', { text });
}

// ─── Wordlist ───────────────────────────────────────────────────────────────

export function wordlistTransform(
  content: string,
  operation: string,
  arg1?: string,
  arg2?: string
): Promise<string> {
  return tauriInvoke<string>('wordlist_transform', {
    content,
    operation,
    arg1: arg1 ?? null,
    arg2: arg2 ?? null,
  });
}

// ─── File Watcher Stub ──────────────────────────────────────────────────────

/**
 * Stub for the Electron-style fs.watch API.
 * Tauri doesn't expose fs.watch directly in the renderer.
 */
export async function watch(): Promise<{ close: () => void }> {
  return { close: () => {} };
}

/**
 * Tauri Shim — bridges window.electron (Electron IPC) to Tauri invoke/listen.
 *
 * This file replaces Electron's preload bridge so that all renderer code using
 * `window.electron.invoke(channel, ...args)` works transparently against the
 * Tauri Rust backend.
 */
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

console.log('[tauri-shim] loading…');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convenience: build a Win-style path from segments (renderer expects this) */
function joinPath(...parts) {
    return parts.filter(Boolean).join('\\').replace(/[/\\]+/g, '\\');
}

/** Return trailing file/folder name from a path string */
function basename(p) {
    return (p || '').split(/[/\\]/).filter(Boolean).pop() || '';
}

// Unlisten map for event subscriptions
const _unlisteners = {};

// ─── invoke() dispatch ──────────────────────────────────────────────────────

async function shimInvoke(channel, ...args) {
    switch (channel) {

        // ── Single WHOIS ────────────────────────────────────────────────
        case 'singlewhois:lookup':
            return invoke('whois_lookup', { domain: args[0] });

        // ── Bulk WHOIS ──────────────────────────────────────────────────
        case 'bulkwhois:lookup':
            return invoke('bulk_whois_lookup', {
                domains: args[0],
                concurrency: 4,
                timeoutMs: 5000,
            });
        case 'bulkwhois:lookup.pause':
            return invoke('bulk_whois_pause');
        case 'bulkwhois:lookup.continue':
            return invoke('bulk_whois_continue');
        case 'bulkwhois:lookup.stop':
            return invoke('bulk_whois_stop');
        case 'bulkwhois:input.file':
            return window.__TAURI__.dialog.open({
                multiple: true,
                filters: [{ name: 'Text / List', extensions: ['txt', 'list', 'csv'] }],
            });
        case 'bulkwhois:input.wordlist':
            // Wordlist input is handled client-side; noop
            return;
        case 'bulkwhois:export': {
            const results = args[0];
            const options = args[1];
            const filePath = await window.__TAURI__.dialog.save({
                title: 'Save export file',
                filters: options.filetype === 'csv'
                    ? [{ name: 'CSV', extensions: ['csv'] }]
                    : [{ name: 'ZIP Archive', extensions: ['zip'] }],
            });
            if (!filePath) return;
            return invoke('bulk_whois_export', { results, options, path: filePath });
        }
        case 'bulkwhois:export.cancel':
            // Client-side cancel — no backend action needed
            return;

        // ── BWA (Bulk Whois Analyser) ───────────────────────────────────
        case 'bwa:input.file':
            return window.__TAURI__.dialog.open({
                multiple: true,
                filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }],
            });
        case 'bwa:analyser.start':
            return invoke('bwa_analyser_start', { data: args[0] });

        // ── Text Operations ─────────────────────────────────────────────
        case 'to:input.file':
            return window.__TAURI__.dialog.open({
                multiple: false,
                filters: [{ name: 'Text', extensions: ['txt', 'list', 'csv'] }],
            });
        case 'to:process':
            return invoke('to_process', { content: args[0], options: args[1] });

        // ── CSV ─────────────────────────────────────────────────────────
        case 'csv:parse':
            return invoke('csv_parse', { content: args[0] });

        // ── Availability ────────────────────────────────────────────────
        case 'availability:check':
            return invoke('availability_check', { text: args[0] });
        case 'availability:params':
            return invoke('availability_params', {
                domain: args[0] ?? null,
                status: args[1] ?? null,
                text: args[2],
            });

        // ── FS Operations ───────────────────────────────────────────────
        case 'fs:readFile':
        case 'bw:file-read':
        case 'bwa:file-read':
            return invoke('fs_read_file', { path: args[0] });
        case 'fs:writeFile':
            return invoke('fs_write_file', { path: args[0], content: args[1] });
        case 'fs:exists':
            return invoke('fs_exists', { path: args[0] });
        case 'fs:stat':
            return invoke('fs_stat', { path: args[0] });
        case 'fs:readdir':
            return invoke('fs_readdir', { path: args[0] });
        case 'fs:unlink':
            return invoke('fs_unlink', { path: args[0] });
        case 'fs:access':
            return invoke('fs_access', { path: args[0] });
        case 'fs:mkdir':
            return invoke('fs_mkdir', { path: args[0] });

        // ── I18n ────────────────────────────────────────────────────────
        case 'i18n:load':
            return invoke('i18n_load', { lang: args[0] });

        // ── Settings ────────────────────────────────────────────────────
        case 'settings:load': {
            const userDataPath = await invoke('app_get_user_data_path');
            const settingsJson = await invoke('settings_load', { filename: 'settings.json' });
            let parsed = {};
            try { parsed = JSON.parse(settingsJson); } catch { /* use empty */ }
            return { settings: parsed, userDataPath };
        }
        case 'settings:save':
            return invoke('settings_save', {
                filename: 'settings.json',
                content: JSON.stringify(args[0]),
            }).then(() => 'SAVED');
        case 'config:delete':
            return invoke('config_delete', { filename: args[0] });
        case 'config:export':
            return invoke('config_export');
        case 'config:import': {
            const files = await window.__TAURI__.dialog.open({
                multiple: false,
                filters: [{ name: 'JSON', extensions: ['json'] }],
            });
            if (!files) return;
            const content = await invoke('fs_read_file', { path: Array.isArray(files) ? files[0] : files });
            return invoke('config_import', { content });
        }

        // ── Profiles ────────────────────────────────────────────────────
        case 'profiles:list':
            return invoke('profiles_list');
        case 'profiles:create':
            return invoke('profiles_create', { name: args[0], copyCurrent: args[1] ?? false });
        case 'profiles:rename':
            return invoke('profiles_rename', { id: args[0], newName: args[1] });
        case 'profiles:delete':
            return invoke('profiles_delete', { id: args[0] });
        case 'profiles:set-current':
            return invoke('profiles_set_current', { id: args[0] });
        case 'profiles:export':
            return invoke('profiles_export', { id: args[0] ?? null });
        case 'profiles:import': {
            const zipFiles = await window.__TAURI__.dialog.open({
                multiple: false,
                filters: [{ name: 'ZIP', extensions: ['zip'] }],
            });
            if (!zipFiles) return undefined;
            // For now, return the path; full import requires further backend work
            return { id: basename(Array.isArray(zipFiles) ? zipFiles[0] : zipFiles).replace('.zip', '') };
        }

        // ── DB Merge ────────────────────────────────────────────────────
        case 'db:pick-files':
            return window.__TAURI__.dialog.open({
                multiple: true,
                filters: [{ name: 'SQLite / JSON', extensions: ['sqlite', 'db', 'sqlite3', 'json'] }],
            });
        case 'history:merge':
            return invoke('history_merge', { paths: args[0] });
        case 'cache:merge':
            return invoke('cache_merge', { paths: args[0] });

        // ── History ─────────────────────────────────────────────────────
        case 'history:get':
            return invoke('db_gui_history_get', { limit: args[0] || 50 });
        case 'history:clear':
            return invoke('db_gui_history_clear');
        case 'history:mode':
            return 'tauri';

        // ── Cache (renderer-level) ──────────────────────────────────────
        case 'cache:get': {
            const key = `${args[0]}:${args[1]}`;
            const ttl = args[2]?.ttl ? args[2].ttl * 1000 : null;
            return invoke('db_gui_cache_get', { key, ttlMs: ttl });
        }
        case 'cache:set': {
            const cKey = `${args[0]}:${args[1]}`;
            return invoke('db_gui_cache_set', { key: cKey, response: args[2], maxEntries: 1000 });
        }
        case 'cache:clear':
            return invoke('db_gui_cache_clear');

        // ── Stats ───────────────────────────────────────────────────────
        case 'stats:start':
            return invoke('stats_start', { configPath: args[0], dataPath: args[1] });
        case 'stats:refresh':
            return invoke('stats_refresh', { id: args[0] });
        case 'stats:stop':
            return invoke('stats_stop', { id: args[0] });
        case 'stats:get':
            return invoke('stats_get', { configPath: args[0], dataPath: args[1] });

        // ── Monitor ─────────────────────────────────────────────────────
        case 'monitor:start':
            return invoke('monitor_start');
        case 'monitor:stop':
            return invoke('monitor_stop');
        case 'monitor:lookup':
            return invoke('monitor_lookup', { domain: args[0] });

        // ── Shell / App ─────────────────────────────────────────────────
        case 'shell:openPath':
            return invoke('shell_open_path', { path: args[0] });
        case 'app:open-data-dir': {
            const udp = await invoke('app_get_user_data_path');
            return invoke('shell_open_path', { path: udp });
        }
        case 'app:get-base-dir':
            return invoke('app_get_base_dir');
        case 'app:get-user-data-path':
            return invoke('app_get_user_data_path');
        case 'app:minimize':
            return window.__TAURI__.window.getCurrentWindow().minimize();
        case 'app:maximize':
            return window.__TAURI__.window.getCurrentWindow().toggleMaximize();
        case 'app:close':
            return window.__TAURI__.window.getCurrentWindow().close();
        case 'app:reload':
            return window.location.reload();
        case 'app:toggleDevtools':
            // Dev-tools toggle is not directly available in Tauri; handled by OS shortcut
            return;

        // ── DNS / RDAP ──────────────────────────────────────────────────
        case 'dns:lookup':
            return invoke('dns_lookup_cmd', { domain: args[0] });
        case 'rdap:lookup':
            return invoke('rdap_lookup_cmd', { domain: args[0] });

        // ── Path helpers ────────────────────────────────────────────────
        case 'path:join':
            return joinPath(...args);
        case 'path:basename':
            return basename(args[0]);

        // ── Fallback ────────────────────────────────────────────────────
        default:
            console.warn(`[tauri-shim] Unhandled invoke: ${channel}`, args);
            return null;
    }
}

// ─── send() dispatch (fire-and-forget style) ────────────────────────────────

function shimSend(channel, ...args) {
    switch (channel) {
        case 'singlewhois:openlink':
            invoke('shell_open_path', { path: args[0] });
            break;
        case 'app:exit-confirmed':
            window.__TAURI__.window.getCurrentWindow().close();
            break;
        case 'app:debug':
        case 'app:error':
            console.log(`[${channel}]`, ...args);
            break;
        default:
            console.log(`[tauri-shim] send: ${channel}`, args);
    }
}

// ─── on() / off() event listeners ───────────────────────────────────────────

async function shimOn(channel, listener) {
    let unlisten;

    switch (channel) {
        case 'bulkwhois:status.update':
        case 'bulkwhois:status-update':
            unlisten = await listen('bulk:status', (event) => {
                listener(null, 'domains.sent', event.payload.sent);
                listener(null, 'domains.total', event.payload.total);
            });
            break;

        case 'bulkwhois:result.receive':
            unlisten = await listen('bulk:result', (event) => {
                listener(null, event.payload);
            });
            break;

        case 'bulkwhois:export.cancel':
        case 'bulkwhois:export.error':
            unlisten = await listen(channel, (event) => {
                listener(null, event.payload);
            });
            break;

        case 'stats:update':
            unlisten = await listen('stats:update', (event) => {
                listener(event.payload);
            });
            break;

        case 'monitor:update':
            unlisten = await listen('monitor:update', (event) => {
                listener(event.payload);
            });
            break;

        case 'monitor:heartbeat':
            unlisten = await listen('monitor:heartbeat', (event) => {
                listener(event.payload);
            });
            break;

        case 'settings:reloaded':
            unlisten = await listen('settings:reloaded', (event) => {
                listener(null, event.payload);
            });
            break;

        default:
            unlisten = await listen(channel, (event) => {
                listener(event.payload);
            });
            break;
    }

    _unlisteners[channel] = unlisten;
}

function shimOff(channel) {
    if (_unlisteners[channel]) {
        _unlisteners[channel]();
        delete _unlisteners[channel];
    }
}

// ─── Build the window.electron bridge ───────────────────────────────────────

window.electron = {
    invoke: shimInvoke,
    send: shimSend,
    on: shimOn,
    off: shimOff,

    // Direct convenience helpers used by some renderer modules
    readFile: (p) => invoke('fs_read_file', { path: p }),
    writeFile: (p, c) => invoke('fs_write_file', { path: p, content: c }),
    stat: (p) => invoke('fs_stat', { path: p }),
    readdir: (p) => invoke('fs_readdir', { path: p }),
    unlink: (p) => invoke('fs_unlink', { path: p }),
    access: (p) => invoke('fs_access', { path: p }),
    exists: (p) => invoke('fs_exists', { path: p }),
    bwFileRead: (p) => invoke('fs_read_file', { path: p }),
    bwaFileRead: (p) => invoke('fs_read_file', { path: p }),
    loadTranslations: (lang) => invoke('i18n_load', { lang }),

    startStats: (cfg, dir) => invoke('stats_start', { configPath: cfg, dataPath: dir }),
    refreshStats: (id) => invoke('stats_refresh', { id }),
    stopStats: (id) => invoke('stats_stop', { id }),
    getStats: (cfg, dir) => invoke('stats_get', { configPath: cfg, dataPath: dir }),

    // File watcher stub (Tauri doesn't have Electron's fs.watch in renderer)
    watch: async () => ({ close: () => {} }),

    getBaseDir: () => invoke('app_get_base_dir'),
    openDataDir: async () => {
        const udp = await invoke('app_get_user_data_path');
        return invoke('shell_open_path', { path: udp });
    },

    path: {
        join: (...args) => joinPath(...args),
        basename: (p) => basename(p),
    },
};

console.log('[tauri-shim] loaded ✓');

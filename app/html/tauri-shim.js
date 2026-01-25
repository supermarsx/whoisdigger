// Tauri Shim for Electron API
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

console.log("Tauri shim loading...");

window.electron = {
    invoke: async (channel, ...args) => {
        console.log(`[Tauri] Invoke: ${channel}`, args);
        switch (channel) {
            case 'singlewhois:lookup':
                return invoke('whois_lookup', { domain: args[0] });
            case 'bulkwhois:lookup':
                return invoke('bulk_whois_lookup', { 
                    domains: args[0], 
                    concurrency: 4, 
                    timeout_ms: 5000 
                });
            case 'bulkwhois:export':
                {
                    const results = args[0];
                    const options = args[1];
                    const filePath = await window.__TAURI__.dialog.save({
                        title: 'Save export file',
                        filters: options.filetype === 'csv' ? 
                            [{ name: 'CSV', extensions: ['csv'] }] : 
                            [{ name: 'Text', extensions: ['txt'] }]
                    });
                    if (!filePath) return;
                    return invoke('bulk_whois_export', { results, options, path: filePath });
                }
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
            case 'i18n:load':
                return invoke('i18n_load', { lang: args[0] });
            case 'availability:check':
                return invoke('availability_check', { text: args[0] });
            case 'availability:params':
                return invoke('availability_params', { domain: args[0], status: args[1], text: args[2] });
            case 'stats:start':
                return invoke('stats_start', { configPath: args[0], dataPath: args[1] });
            case 'stats:refresh':
                return invoke('stats_refresh', { id: args[0] });
            case 'stats:stop':
                return invoke('stats_stop', { id: args[0] });
            case 'stats:get':
                return invoke('stats_get', { configPath: args[0], dataPath: args[1] });
            case 'monitor:start':
                return invoke('monitor_start');
            case 'monitor:stop':
                return invoke('monitor_stop');
            case 'app:minimize':
                return window.__TAURI__.window.getCurrentWindow().minimize();
            case 'app:close':
                return window.__TAURI__.window.getCurrentWindow().close();
            case 'app:reload':
                return window.__TAURI__.process.relaunch();
            case 'db:pick-files':
                return window.__TAURI__.dialog.open({
                    multiple: true,
                    filters: [{ name: 'SQLite/JSON', extensions: ['sqlite', 'db', 'sqlite3', 'json'] }]
                });
            case 'app:toggleDevtools':
                // Not easily available via JS API in v2 without plugin, 
                // but usually handled via dev shortcut or console.
                return;
            case 'app:get-base-dir':
                return invoke('app_get_base_dir');
            case 'app:get-user-data-path':
                return invoke('app_get_user_data_path');
            case 'app:open-data-dir':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    return invoke('shell_open_path', { path: userDataPath });
                }
            case 'shell:openPath':
                return invoke('shell_open_path', { path: args[0] });
            case 'settings:load':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    const settingsJson = await invoke('settings_load', { filename: 'settings.json' });
                    return { settings: JSON.parse(settingsJson), userDataPath };
                }
            case 'settings:save':
                return invoke('settings_save', { filename: 'settings.json', content: JSON.stringify(args[0]) });
            case 'config:delete':
                return invoke('config_delete', { filename: args[0] });
            case 'history:get':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    const dbPath = `${userDataPath}\profiles\default\history-default.sqlite`;
                    return invoke('db_history_get', { path: dbPath, limit: args[0] || 50 });
                }
            case 'history:clear':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    const dbPath = `${userDataPath}\profiles\default\history-default.sqlite`;
                    return invoke('db_history_clear', { path: dbPath });
                }
            case 'history:mode':
                return 'tauri';
            case 'cache:get':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    const dbPath = `${userDataPath}\profiles\default\request-cache.sqlite`;
                    return invoke('db_cache_get', { path: dbPath, key: `${args[0]}:${args[1]}`, ttlMs: args[2]?.ttl ? args[2].ttl * 1000 : null });
                }
            case 'cache:set':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    const dbPath = `${userDataPath}\profiles\default\request-cache.sqlite`;
                    return invoke('db_cache_set', { path: dbPath, key: `${args[0]}:${args[1]}`, response: args[2], maxEntries: 1000 });
                }
            case 'cache:clear':
                {
                    const userDataPath = await invoke('app_get_user_data_path');
                    const dbPath = `${userDataPath}\profiles\default\request-cache.sqlite`;
                    return invoke('db_cache_clear', { path: dbPath });
                }
            case 'path:join':
                return args.join('\\').replace(/[/\\]+/g, '\\'); 
            case 'path:basename':
                 return args[0].split(/[/\\]/).pop();
            default:
                console.warn(`[Tauri] Unhandled invoke: ${channel}`);
                return null;
        }
    },
    send: (channel, ...args) => {
        console.log(`[Tauri] Send: ${channel}`, args);
        if (channel === 'singlewhois:openlink') {
            invoke('shell_open_path', { path: args[0] });
        }
        if (channel === 'app:exit-confirmed') {
            window.__TAURI__.window.getCurrentWindow().close();
        }
    },
    on: async (channel, listener) => {
        console.log(`[Tauri] On: ${channel}`);
        let unlisten;
        if (channel === 'bulkwhois:status-update') {
            unlisten = await listen('bulk:status', (event) => {
                listener(null, 'domains.sent', event.payload.sent);
                listener(null, 'domains.total', event.payload.total);
            });
        } else if (channel === 'stats:update') {
            unlisten = await listen('stats:update', (event) => {
                listener(event.payload);
            });
        } else if (channel === 'monitor:update') {
             unlisten = await listen('monitor:heartbeat', (event) => {
                // listener(event.payload);
            });
        } else {
            unlisten = await listen(channel, (event) => {
                listener(event.payload);
            });
        }
        window._unlisteners = window._unlisteners || {};
        window._unlisteners[channel] = unlisten;
    },
    off: (channel, listener) => {
         console.log(`[Tauri] Off: ${channel}`);
         if (window._unlisteners && window._unlisteners[channel]) {
             window._unlisteners[channel]();
             delete window._unlisteners[channel];
         }
    },
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
    watch: async () => ({ close: () => {} }),
    getBaseDir: () => invoke('app_get_base_dir'),
    openDataDir: () => invoke('shell_open_path', { path: 'data' }), // Placeholder
    path: {
        join: (...args) => args.join('\\').replace(/[/\\]+/g, '\\'),
        basename: (p) => p.split(/[/\\]/).pop()
    }
};
console.log("Tauri shim loaded.");
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
            case 'fs:readFile':
            case 'bw:file-read':
            case 'bwa:file-read':
                return invoke('fs_read_file', { path: args[0] });
            case 'fs:exists':
                return invoke('fs_exists', { path: args[0] });
            case 'fs:stat':
                return invoke('fs_stat', { path: args[0] });
            case 'fs:readdir':
                return invoke('fs_readdir', { path: args[0] });
            case 'fs:unlink':
                return invoke('fs_unlink', { path: args[0] });
            case 'i18n:load':
                return invoke('i18n_load', { lang: args[0] });
            case 'app:get-base-dir':
                return invoke('app_get_base_dir');
            case 'path:join':
                return args.join('\\').replace(/[/\\]+/g, '\\'); 
            case 'path:basename':
                 return args[0].split(/[\\/]/).pop();
            default:
                console.warn(`[Tauri] Unhandled invoke: ${channel}`);
                return null;
        }
    },
    send: (channel, ...args) => {
        console.log(`[Tauri] Send: ${channel}`, args);
    },
    on: (channel, listener) => {
        console.log(`[Tauri] On: ${channel}`);
        // TODO: Real event listening via tauri listen
    },
    off: (channel, listener) => {
         console.log(`[Tauri] Off: ${channel}`);
    },
    readFile: (p) => invoke('fs_read_file', { path: p }),
    stat: (p) => invoke('fs_stat', { path: p }),
    readdir: (p) => invoke('fs_readdir', { path: p }),
    unlink: (p) => invoke('fs_unlink', { path: p }),
    access: (p) => invoke('fs_exists', { path: p }), // use exists as fallback for access
    exists: (p) => invoke('fs_exists', { path: p }),
    bwFileRead: (p) => invoke('fs_read_file', { path: p }),
    bwaFileRead: (p) => invoke('fs_read_file', { path: p }),
    loadTranslations: (lang) => invoke('i18n_load', { lang }),
    startStats: () => {},
    refreshStats: () => {},
    stopStats: () => {},
    getStats: () => Promise.resolve({}),
    watch: async () => ({ close: () => {} }),
    getBaseDir: () => invoke('app_get_base_dir'),
    openDataDir: () => {},
    path: {
        join: (...args) => args.join('\\').replace(/[/\\]+/g, '\\'),
        basename: (p) => p.split(/[\\/]/).pop()
    }
};
console.log("Tauri shim loaded.");
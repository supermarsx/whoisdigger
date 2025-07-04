// Use CommonJS imports so the compiled preload script works when loaded via
// Electron's `require` mechanism.
const { contextBridge, ipcRenderer } = require('electron');
type IpcRendererEvent = import('electron').IpcRendererEvent;

const listenerMap = new WeakMap<Function, (...args: any[]) => void>();

const api = {
  send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => listener(...args);
    listenerMap.set(listener, wrapped);
    ipcRenderer.on(channel, wrapped);
  },
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = listenerMap.get(listener);
    if (wrapped) {
      ipcRenderer.removeListener(channel, wrapped);
      listenerMap.delete(listener);
    }
  },
  readFile: (p: string, opts?: any) => ipcRenderer.invoke('fs:readFile', p, opts),
  stat: (p: string) => ipcRenderer.invoke('fs:stat', p),
  readdir: (p: string, opts?: any) => ipcRenderer.invoke('fs:readdir', p, opts),
  unlink: (p: string) => ipcRenderer.invoke('fs:unlink', p),
  access: (p: string, mode?: number) => ipcRenderer.invoke('fs:access', p, mode),
  exists: (p: string) => ipcRenderer.invoke('fs:exists', p),
  bwFileRead: (p: string) => ipcRenderer.invoke('bw:file-read', p),
  bwaFileRead: (p: string) => ipcRenderer.invoke('bwa:file-read', p),
  loadTranslations: (lang: string) => ipcRenderer.invoke('i18n:load', lang),
  startSettingsStats: (cfg: string, dir: string) =>
    ipcRenderer.invoke('settings:start-stats', cfg, dir),
  refreshSettingsStats: (id: number) => ipcRenderer.invoke('settings:refresh-stats', id),
  stopSettingsStats: (id: number) => ipcRenderer.invoke('settings:stop-stats', id),
  getSettingsStats: (cfg: string, dir: string) =>
    ipcRenderer.invoke('settings:get-stats', cfg, dir),
  watch: async (p: string, opts: any, cb: (evt: string) => void) => {
    const id = await ipcRenderer.invoke('fs:watch', p, opts);
    const chan = `fs:watch:${id}`;
    const handler = (_e: IpcRendererEvent, ev: string) => cb(ev);
    ipcRenderer.on(chan, handler);
    return {
      close: () => {
        ipcRenderer.invoke('fs:unwatch', id);
        ipcRenderer.removeListener(chan, handler);
      }
    };
  },
  bwWatch: async (p: string, opts: any, cb: (evt: string) => void) => {
    const id = await ipcRenderer.invoke('bw:watch', p, opts);
    const chan = `bw:watch:${id}`;
    const handler = (_e: IpcRendererEvent, ev: string) => cb(ev);
    ipcRenderer.on(chan, handler);
    return {
      close: () => {
        ipcRenderer.invoke('bw:unwatch', id);
        ipcRenderer.removeListener(chan, handler);
      }
    };
  },
  bwaWatch: async (p: string, opts: any, cb: (evt: string) => void) => {
    const id = await ipcRenderer.invoke('bwa:watch', p, opts);
    const chan = `bwa:watch:${id}`;
    const handler = (_e: IpcRendererEvent, ev: string) => cb(ev);
    ipcRenderer.on(chan, handler);
    return {
      close: () => {
        ipcRenderer.invoke('bwa:unwatch', id);
        ipcRenderer.removeListener(chan, handler);
      }
    };
  },
  getBaseDir: () => ipcRenderer.invoke('app:get-base-dir'),
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir'),
  path: {
    join: (...args: string[]) => ipcRenderer.invoke('path:join', ...args),
    basename: (p: string) => ipcRenderer.invoke('path:basename', p)
  }
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', api);
} else {
  (window as any).electron = api;
}

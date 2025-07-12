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
  readFile: (p: string, opts?: BufferEncoding | import('fs').ReadFileOptions) =>
    ipcRenderer.invoke('fs:readFile', p, opts),
  stat: (p: string) => ipcRenderer.invoke('fs:stat', p),
  readdir: (p: string, opts?: import('fs').ReaddirOptions) =>
    ipcRenderer.invoke('fs:readdir', p, opts),
  unlink: (p: string) => ipcRenderer.invoke('fs:unlink', p),
  access: (p: string, mode?: number) => ipcRenderer.invoke('fs:access', p, mode),
  exists: (p: string) => ipcRenderer.invoke('fs:exists', p),
  bwFileRead: (p: string) => ipcRenderer.invoke('bw:file-read', p),
  bwaFileRead: (p: string) => ipcRenderer.invoke('bwa:file-read', p),
  loadTranslations: (lang: string) => ipcRenderer.invoke('i18n:load', lang),
  startStats: (cfg: string, dir: string) => ipcRenderer.invoke('stats:start', cfg, dir),
  refreshStats: (id: number) => ipcRenderer.invoke('stats:refresh', id),
  stopStats: (id: number) => ipcRenderer.invoke('stats:stop', id),
  getStats: (cfg: string, dir: string) => ipcRenderer.invoke('stats:get', cfg, dir),
  watch: async (
    prefix: string,
    p: string,
    opts: import('fs').WatchOptions,
    cb: (evt: string) => void
  ) => {
    const id = await ipcRenderer.invoke('fs:watch', prefix, p, opts);
    const chan = `fs:watch:${prefix}:${id}`;
    const handler = (_e: IpcRendererEvent, ev: string) => cb(ev);
    ipcRenderer.on(chan, handler);
    return {
      close: () => {
        ipcRenderer.invoke('fs:unwatch', id);
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

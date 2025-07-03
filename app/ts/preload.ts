import { contextBridge, ipcRenderer, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const api = {
  send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },
  openPath: (path: string) => shell.openPath(path),
  readFile: (p: string, opts?: any) => ipcRenderer.invoke('fs:readFile', p, opts),
  stat: (p: string) => ipcRenderer.invoke('fs:stat', p),
  readdir: (p: string, opts?: any) => ipcRenderer.invoke('fs:readdir', p, opts),
  unlink: (p: string) => ipcRenderer.invoke('fs:unlink', p),
  access: (p: string, mode?: number) => ipcRenderer.invoke('fs:access', p, mode),
  exists: (p: string) => ipcRenderer.invoke('fs:exists', p),
  startOptionsStats: (cfg: string, dir: string) =>
    ipcRenderer.invoke('options:start-stats', cfg, dir),
  refreshOptionsStats: (id: number) => ipcRenderer.invoke('options:refresh-stats', id),
  stopOptionsStats: (id: number) => ipcRenderer.invoke('options:stop-stats', id),
  getOptionsStats: (cfg: string, dir: string) => ipcRenderer.invoke('options:get-stats', cfg, dir),
  watch: async (p: string, opts: any, cb: (evt: string) => void) => {
    const id = await ipcRenderer.invoke('fs:watch', p, opts);
    const chan = `fs:watch:${id}`;
    const handler = (_e: any, ev: string) => cb(ev);
    ipcRenderer.on(chan, handler);
    return {
      close: () => {
        ipcRenderer.invoke('fs:unwatch', id);
        ipcRenderer.removeListener(chan, handler);
      }
    };
  },
  dirnameCompat: (metaUrl?: string | URL) => {
    const globalDir = (global as any).__dirname;
    if (typeof globalDir === 'string') {
      return globalDir;
    }
    if (metaUrl) {
      try {
        return path.dirname(fileURLToPath(metaUrl));
      } catch {
        /* ignore */
      }
    }
    if (typeof __dirname !== 'undefined') {
      return __dirname;
    }
    let url = metaUrl;
    if (!url) {
      try {
        url = Function(
          'return typeof import!=="undefined" && import.meta && import.meta.url ? import.meta.url : undefined'
        )();
      } catch {
        url = undefined;
      }
    }
    if (typeof url === 'string') {
      try {
        return path.dirname(fileURLToPath(url));
      } catch {
        /* ignore */
      }
    }
    if (typeof __filename !== 'undefined') {
      return path.dirname(__filename);
    }
    if (process.mainModule && process.mainModule.filename) {
      return path.dirname(process.mainModule.filename);
    }
    if (process.argv[1]) {
      return path.dirname(process.argv[1]);
    }
    return process.cwd();
  },
  path: {
    join: (...args: string[]) => path.join(...args),
    basename: (p: string) => path.basename(p)
  }
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', api);
} else {
  (window as any).electron = api;
}

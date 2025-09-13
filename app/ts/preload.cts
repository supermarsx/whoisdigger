// Use CommonJS imports so the compiled preload script works when loaded via
// Electron's `require` mechanism.
const { contextBridge, ipcRenderer } = require('electron');
type IpcRendererEvent = import('electron').IpcRendererEvent;
import type { IpcChannel } from './common/ipcChannels.js';
import type { IpcContracts } from './common/ipcContracts.js';

const listenerMap = new WeakMap<Function, (...args: any[]) => void>();

function invoke<C extends IpcChannel>(
  channel: C,
  ...args: IpcContracts[C]['request']
): Promise<IpcContracts[C]['response']>;
function invoke(channel: string, ...args: unknown[]): Promise<unknown>;
function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  return ipcRenderer.invoke(channel, ...args);
}

const api = {
  send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  invoke,
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
    cb: (evt: { event: string; filename: string | null }) => void
  ) => {
    const id = await ipcRenderer.invoke('fs:watch', prefix, p, opts);
    const chan = `fs:watch:${prefix}:${id}`;
    const handler = (_e: IpcRendererEvent, ev: { event: string; filename: string | null }) =>
      cb(ev);
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

// Hook console.error during WDIO E2E to capture renderer errors.
try {
  const isWdio = typeof process !== 'undefined' && (process as any)?.env?.WDIO_E2E === '1';
  if (isWdio && typeof window !== 'undefined') {
    (window as any).__rendererErrors = [];
    const originalError = console.error.bind(console);
    console.error = (...args: any[]) => {
      try {
        (window as any).__rendererErrors.push(args.map(String).join(' '));
      } catch {}
      originalError(...args);
    };
  }
} catch {}

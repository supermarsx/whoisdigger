import { contextBridge, ipcRenderer, shell } from 'electron';

const api = {
  send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },
  openPath: (path: string) => shell.openPath(path)
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', api);
} else {
  (window as any).electron = api;
}

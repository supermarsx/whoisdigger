import { app, ipcMain } from 'electron';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { IpcChannel } from '../common/ipcChannels.js';
import { debugFactory } from '../common/logger.js';
import { handle } from './ipc.js';

type ReadFileOpts = BufferEncoding | fs.ReadFileOptions;
type ReaddirOpts = fs.ReaddirOptions | BufferEncoding | undefined;

const debug = debugFactory('main.fs');
const watchers = new Map<number, fs.FSWatcher>();
let watcherId = 0;

function normalizePath(p: string): string {
  if (typeof p === 'string' && p.startsWith('file:')) {
    try {
      return fileURLToPath(p);
    } catch {
      return p;
    }
  }
  return p;
}

export function cleanupWatchers() {
  for (const watcher of watchers.values()) {
    watcher.close();
  }
  watchers.clear();
}

app?.on('will-quit', cleanupWatchers);
process.on('exit', cleanupWatchers);

// Avoid direct import.meta usage for CJS test environment
const hot = (() => {
  try {
    return (eval('import.meta') as any)?.hot as undefined | { dispose: (cb: () => void) => void };
  } catch {
    return undefined;
  }
})();
hot?.dispose?.(cleanupWatchers);

ipcMain.handle('fs:readFile', async (_e, p: string, opts?: ReadFileOpts) => {
  return fs.promises.readFile(normalizePath(p), opts);
});

ipcMain.handle('fs:stat', async (_e, p: string) => {
  return fs.promises.stat(normalizePath(p));
});

ipcMain.handle('fs:readdir', async (_e, p: string, opts?: ReaddirOpts) => {
  return fs.promises.readdir(normalizePath(p), opts as any);
});

ipcMain.handle('fs:unlink', async (_e, p: string) => {
  return fs.promises.unlink(normalizePath(p));
});

ipcMain.handle('fs:access', async (_e, p: string, mode?: number) => {
  return fs.promises.access(normalizePath(p), mode);
});

ipcMain.handle('fs:exists', async (_e, p: string) => {
  return fs.existsSync(normalizePath(p));
});

ipcMain.handle('fs:watch', (e, prefix: string, p: string, opts?: fs.WatchOptions) => {
  const id = ++watcherId;
  const sender = e.sender;
  const watcher = fs.watch(normalizePath(p), opts || {}, (event, filename) => {
    sender.send(`fs:watch:${prefix}:${id}`, { event, filename });
  });
  const dispose = () => {
    watcher.close();
    watchers.delete(id);
  };
  watcher.on('error', (err) => {
    debug(`Watcher error for ${p}: ${err}`);
    dispose();
  });
  sender.once('destroyed', dispose);
  watchers.set(id, watcher);
  return id;
});

ipcMain.handle('fs:unwatch', (_e, id: number) => {
  const watcher = watchers.get(id);
  if (watcher) {
    watcher.close();
    watchers.delete(id);
  }
});

handle(IpcChannel.BwFileRead, async (_e, p: string) => {
  return fs.promises.readFile(p);
});

handle(IpcChannel.BwaFileRead, async (_e, p: string) => {
  return fs.promises.readFile(p);
});

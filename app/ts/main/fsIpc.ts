import { ipcMain } from 'electron';
import fs from 'fs';

type ReadFileOpts = BufferEncoding | fs.ReadFileOptions;
type ReaddirOpts = fs.ReaddirOptions | BufferEncoding | undefined;

const watchers = new Map<number, fs.FSWatcher>();
let watcherId = 0;

export function cleanupWatchers() {
  for (const watcher of watchers.values()) {
    watcher.close();
  }
  watchers.clear();
}

ipcMain.handle('fs:readFile', async (_e, p: string, opts?: ReadFileOpts) => {
  return fs.promises.readFile(p, opts);
});

ipcMain.handle('fs:stat', async (_e, p: string) => {
  return fs.promises.stat(p);
});

ipcMain.handle('fs:readdir', async (_e, p: string, opts?: ReaddirOpts) => {
  return fs.promises.readdir(p, opts as any);
});

ipcMain.handle('fs:unlink', async (_e, p: string) => {
  return fs.promises.unlink(p);
});

ipcMain.handle('fs:access', async (_e, p: string, mode?: number) => {
  return fs.promises.access(p, mode);
});

ipcMain.handle('fs:exists', async (_e, p: string) => {
  return fs.existsSync(p);
});

ipcMain.handle('fs:watch', (e, prefix: string, p: string, opts?: fs.WatchOptions) => {
  const id = ++watcherId;
  const sender = e.sender;
  const watcher = fs.watch(p, opts || {}, (event) => {
    sender.send(`fs:watch:${prefix}:${id}`, event);
  });
  sender.once('destroyed', () => {
    watcher.close();
    watchers.delete(id);
  });
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

ipcMain.handle('bw:file-read', async (_e, p: string) => {
  return fs.promises.readFile(p);
});

ipcMain.handle('bwa:file-read', async (_e, p: string) => {
  return fs.promises.readFile(p);
});

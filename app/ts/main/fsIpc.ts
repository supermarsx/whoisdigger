import { ipcMain } from 'electron';
import fs from 'fs';

const watchers = new Map<number, fs.FSWatcher>();
let watcherId = 0;

ipcMain.handle('fs:readFile', async (_e, p: string, opts?: any) => {
  return fs.promises.readFile(p, opts);
});

ipcMain.handle('fs:stat', async (_e, p: string) => {
  return fs.promises.stat(p);
});

ipcMain.handle('fs:readdir', async (_e, p: string, opts?: any) => {
  return fs.promises.readdir(p, opts);
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

ipcMain.handle('fs:watch', (e, p: string, opts?: fs.WatchOptions) => {
  const id = ++watcherId;
  const sender = e.sender;
  const watcher = fs.watch(p, opts || {}, (event) => {
    sender.send(`fs:watch:${id}`, event);
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

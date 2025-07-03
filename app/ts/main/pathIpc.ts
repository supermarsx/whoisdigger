import { ipcMain } from 'electron';
import path from 'path';

ipcMain.handle('path:join', (_e, ...args: string[]) => {
  return path.join(...args);
});

ipcMain.handle('path:basename', (_e, p: string) => {
  return path.basename(p);
});

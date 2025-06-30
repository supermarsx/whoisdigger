import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

ipcMain.handle('fs:readFile', async (_e, filePath: string, encoding?: string) => {
  const data = await fs.promises.readFile(filePath, encoding as any);
  return encoding ? data.toString() : data;
});

ipcMain.handle('fs:stat', async (_e, filePath: string) => {
  const st = await fs.promises.stat(filePath);
  return { ...st, isFile: st.isFile(), isDirectory: st.isDirectory() };
});

ipcMain.handle('fs:readdir', async (_e, dir: string) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries.map((e) => ({ name: e.name, isFile: e.isFile(), isDirectory: e.isDirectory() }));
});

ipcMain.handle('fs:access', async (_e, filePath: string, mode?: number) => {
  try {
    await fs.promises.access(filePath, mode);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:unlink', async (_e, filePath: string) => {
  await fs.promises.unlink(filePath);
});

ipcMain.handle('fs:exists', (_e, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('path:join', (_e, ...parts: string[]) => {
  return path.join(...parts);
});

ipcMain.handle('path:basename', (_e, p: string) => {
  return path.basename(p);
});

import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { dirnameCompat } from '../utils/dirnameCompat.js';

const baseDir = dirnameCompat();

ipcMain.handle('i18n:load', async (_e, lang: string) => {
  const file = path.join(baseDir, '..', 'locales', `${lang}.json`);
  try {
    const raw = await fs.promises.readFile(file, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
});

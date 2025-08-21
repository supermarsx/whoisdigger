import fs from 'fs';
import path from 'path';
import { dirnameCompat } from '../utils/dirnameCompat.js';
import { IpcChannel } from '../common/ipcChannels.js';
import { handle } from './ipc.js';

const baseDir = dirnameCompat();

handle(IpcChannel.I18nLoad, async (_e, lang: string) => {
  const file = path.join(baseDir, '..', 'locales', `${lang}.json`);
  try {
    return await fs.promises.readFile(file, 'utf8');
  } catch {
    return '{}';
  }
});

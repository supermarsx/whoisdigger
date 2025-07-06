import fs from 'fs';
import path from 'path';
import https from 'https';
import { debugFactory } from '../common/logger.js';
import { settings, getUserDataPath } from '../common/settings.js';

const debug = debugFactory('ai.modelDownloader');

export async function downloadModel(url: string, dest: string): Promise<void> {
  const baseDir = path.resolve(getUserDataPath(), settings.ai.dataPath);
  const destPath = path.resolve(baseDir, dest);
  if (destPath !== baseDir && !destPath.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid destination path');
  }
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const cleanup = (err: Error): void => {
      file.close(() => {
        fs.unlink(destPath, () => {
          debug(`Download failed: ${err}`);
          reject(err);
        });
      });
    };
    https
      .get(url, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          cleanup(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      })
      .on('error', (err) => {
        cleanup(err);
      });
  });
}

import path from 'path';
import fs from 'fs';
import { dialog, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import { handle } from './ipc.js';
import { IpcChannel } from '../common/ipcChannels.js';
import { getUserDataPath } from './settings-main.js';
import { settings } from '../common/settings.js';
import { requestCache } from '../common/requestCacheSingleton.js';

function currentProfileDir(): string {
  const dir = (settings as any)?.database?.profileDir || 'default';
  return path.join(getUserDataPath(), 'profiles', dir);
}

function currentHistoryPath(): string {
  const hist = (settings as any)?.database?.historyName || 'history-default.sqlite';
  return path.join(currentProfileDir(), hist);
}

function currentCachePath(): string {
  const cache = (settings as any)?.requestCache?.database || 'request-cache.sqlite';
  return path.join(currentProfileDir(), cache);
}

handle(IpcChannel.DbPickFiles, async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'SQLite/JSON', extensions: ['sqlite', 'db', 'sqlite3', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled) return [];
  return filePaths || [];
});

handle(IpcChannel.HistoryMerge, async (_e, sources: string[]) => {
  const dest = currentHistoryPath();
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    const db = new Database(dest);
    db.exec('CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)');
    const insert = db.prepare('INSERT INTO history(domain,timestamp,status) VALUES(?,?,?)');
    for (const src of sources || []) {
      try {
        if (src.toLowerCase().endsWith('.json')) {
          const raw = await fs.promises.readFile(src, 'utf8');
          const arr = JSON.parse(raw) as { domain: string; timestamp: number; status: string }[];
          for (const r of arr) insert.run(r.domain, r.timestamp || Date.now(), r.status);
        } else {
          const sdb = new Database(src, { readonly: true });
          const rows = sdb.prepare('SELECT domain, timestamp, status FROM history').all() as any[];
          for (const r of rows) insert.run(r.domain, r.timestamp || Date.now(), r.status);
          sdb.close();
        }
      } catch {
        // skip source errors
      }
    }
    db.close();
    // Notify any open window to refresh history
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('history:updated');
    }
  } catch {
    // ignore
  }
});

handle(IpcChannel.CacheMerge, async (_e, sources: string[]) => {
  const dest = currentCachePath();
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    const db = new Database(dest);
    db.exec('CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)');
    const insert = db.prepare('INSERT OR REPLACE INTO cache(key,response,timestamp) VALUES(?,?,?)');
    for (const src of sources || []) {
      try {
        const sdb = new Database(src, { readonly: true });
        const rows = sdb.prepare('SELECT key, response, timestamp FROM cache').all() as any[];
        for (const r of rows) insert.run(r.key, r.response, r.timestamp || Date.now());
        sdb.close();
      } catch {
        // skip broken sources
      }
    }
    db.close();
    // Touch request cache singleton by reading one key to ensure it can reopen
    try {
      await requestCache.get('noop', 'noop');
    } catch {
      /* ignore */
    }
  } catch {
    // ignore
  }
});

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getUserDataPath } from './settings';
import debugModule from 'debug';

const debug = debugModule('common.history');

let db: DatabaseType | undefined;

function init(): DatabaseType {
  if (db) return db;
  const baseDir = path.resolve(getUserDataPath());
  const fileName = process.env.HISTORY_DB_PATH || 'history.sqlite';
  const dbPath = path.resolve(baseDir, fileName);
  if (dbPath !== baseDir && !dbPath.startsWith(baseDir + path.sep)) {
    debug(`Invalid history database path: ${fileName}`);
    throw new Error('Invalid history path');
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)');
  return db;
}

export interface HistoryEntry {
  domain: string;
  timestamp: number;
  status: string;
}

export function addEntry(domain: string, status: string): void {
  const database = init();
  try {
    database
      .prepare('INSERT INTO history(domain,timestamp,status) VALUES(?,?,?)')
      .run(domain, Date.now(), status);
  } catch (e) {
    debug(`Failed to add history entry: ${e}`);
  }
}

export function addEntries(entries: { domain: string; status: string }[]): void {
  const database = init();
  const stmt = database.prepare('INSERT INTO history(domain,timestamp,status) VALUES(?,?,?)');
  const ts = Date.now();
  const insertMany = database.transaction((rows: { domain: string; status: string }[]) => {
    for (const r of rows) stmt.run(r.domain, ts, r.status);
  });
  try {
    insertMany(entries);
  } catch (e) {
    debug(`Failed to add history entries: ${e}`);
  }
}

export function getHistory(limit = 50): HistoryEntry[] {
  const database = init();
  try {
    return database
      .prepare('SELECT domain, timestamp, status FROM history ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as HistoryEntry[];
  } catch (e) {
    debug(`Failed to read history: ${e}`);
    return [];
  }
}

export function clearHistory(): void {
  const database = init();
  try {
    database.prepare('DELETE FROM history').run();
  } catch (e) {
    debug(`Failed to clear history: ${e}`);
  }
}

export function closeHistory(): void {
  if (db) {
    try {
      db.close();
    } catch (e) {
      debug(`Failed to close history db: ${e}`);
    }
    db = undefined;
  }
}

export default { addEntry, addEntries, getHistory, clearHistory, closeHistory };

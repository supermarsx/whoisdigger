import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getUserDataPath, settings } from './settings.js';
import { debugFactory } from './logger.js';

const debug = debugFactory('common.history');

let db: DatabaseType | undefined;
let useJsonFallback = false;
let jsonPath = '';
let jsonCache: HistoryEntry[] = [];

function loadJson(): void {
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      jsonCache = JSON.parse(raw) as HistoryEntry[];
    } else {
      jsonCache = [];
    }
  } catch (e) {
    debug(`Failed to load history JSON: ${e}`);
    jsonCache = [];
  }
}

function saveJson(): void {
  try {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(jsonCache, null, 0), 'utf8');
  } catch (e) {
    debug(`Failed to save history JSON: ${e}`);
  }
}

function init(): DatabaseType | undefined {
  if (db || useJsonFallback) return db;
  const profileDir = (settings as any)?.database?.profileDir || 'default';
  const baseDir = path.resolve(getUserDataPath(), 'profiles', profileDir);
  const fileName =
    (settings as any)?.database?.historyName ||
    process.env.HISTORY_DB_PATH ||
    'history-default.sqlite';
  const dbPath = path.resolve(baseDir, fileName);
  if (dbPath !== baseDir && !dbPath.startsWith(baseDir + path.sep)) {
    debug(`Invalid history database path: ${fileName}`);
    throw new Error('Invalid history path');
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  try {
    db = new Database(dbPath);
    db.exec('CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)');
    return db;
  } catch (e) {
    // Fallback to JSON store when native module is unavailable
    debug(`History DB unavailable, falling back to JSON: ${e}`);
    useJsonFallback = true;
    jsonPath = path.join(baseDir, 'history.json');
    loadJson();
    return undefined;
  }
}

export interface HistoryEntry {
  domain: string;
  timestamp: number;
  status: string;
}

export function addEntry(domain: string, status: string): void {
  const database = init();
  if (useJsonFallback) {
    jsonCache.unshift({ domain, timestamp: Date.now(), status });
    // Limit to 500 entries to avoid runaway growth
    if (jsonCache.length > 500) jsonCache.length = 500;
    saveJson();
    return;
  }
  if (database) {
    try {
      database
        .prepare('INSERT INTO history(domain,timestamp,status) VALUES(?,?,?)')
        .run(domain, Date.now(), status);
    } catch (e) {
      debug(`Failed to add history entry: ${e}`);
    }
  }
}

export function addEntries(entries: { domain: string; status: string }[]): void {
  const database = init();
  if (useJsonFallback) {
    const ts = Date.now();
    const mapped = entries.map((e) => ({ domain: e.domain, status: e.status, timestamp: ts }));
    jsonCache = [...mapped, ...jsonCache].slice(0, 500);
    saveJson();
    return;
  }
  if (database) {
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
}

export function getHistory(limit = 50): HistoryEntry[] {
  const database = init();
  if (useJsonFallback) {
    return jsonCache.slice(0, limit);
  }
  if (database) {
    try {
      return database
        .prepare('SELECT domain, timestamp, status FROM history ORDER BY timestamp DESC LIMIT ?')
        .all(limit) as HistoryEntry[];
    } catch (e) {
      debug(`Failed to read history: ${e}`);
      return [];
    }
  }
  return [];
}

export function clearHistory(): void {
  const database = init();
  if (useJsonFallback) {
    jsonCache = [];
    saveJson();
    return;
  }
  if (database) {
    try {
      database.prepare('DELETE FROM history').run();
    } catch (e) {
      debug(`Failed to clear history: ${e}`);
    }
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
  if (useJsonFallback) {
    // nothing to close
  }
}

export function getHistoryMode(): 'sqlite' | 'json' {
  return useJsonFallback ? 'json' : 'sqlite';
}

export { useJsonFallback };

export default { addEntry, addEntries, getHistory, clearHistory, closeHistory };

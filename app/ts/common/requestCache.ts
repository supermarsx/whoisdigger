import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { settings, getUserDataPath } from './settings';
import debugModule from 'debug';

const debug = debugModule('common.requestCache');

let db: DatabaseType | undefined;

function init(): DatabaseType | undefined {
  const { requestCache } = settings;
  if (!requestCache || !requestCache.enabled) return undefined;
  if (db) return db;
  const baseDir = path.resolve(getUserDataPath());
  const dbPath = path.resolve(baseDir, requestCache.database);
  if (dbPath !== baseDir && !dbPath.startsWith(baseDir + path.sep)) {
    debug(`Invalid cache database path: ${requestCache.database}`);
    return undefined;
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.exec(
    'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)'
  );
  return db;
}

function makeKey(type: string, domain: string): string {
  return `${type}:${domain}`;
}

export function getCached(type: string, domain: string): string | undefined {
  const { requestCache } = settings;
  if (!requestCache.enabled) return undefined;
  const database = init();
  if (!database) return undefined;
  const key = makeKey(type, domain);
  try {
    const row = database.prepare('SELECT response, timestamp FROM cache WHERE key = ?').get(key) as
      | { response: string; timestamp: number }
      | undefined;
    if (!row) return undefined;
    if (Date.now() - row.timestamp > requestCache.ttl * 1000) {
      database.prepare('DELETE FROM cache WHERE key = ?').run(key);
      return undefined;
    }
    debug(`Cache hit for ${key}`);
    return row.response;
  } catch (e) {
    debug(`Cache get failed: ${e}`);
    return undefined;
  }
}

export function setCached(type: string, domain: string, response: string): void {
  const { requestCache } = settings;
  if (!requestCache.enabled) return;
  const database = init();
  if (!database) return;
  const key = makeKey(type, domain);
  try {
    database
      .prepare('INSERT OR REPLACE INTO cache(key, response, timestamp) VALUES(?, ?, ?)')
      .run(key, response, Date.now());
    debug(`Cached response for ${key}`);
  } catch (e) {
    debug(`Cache set failed: ${e}`);
  }
}

export function closeCache(): void {
  if (db) {
    try {
      db.close();
    } catch (e) {
      debug(`Cache close failed: ${e}`);
    }
    db = undefined;
  }
}

export default { getCached, setCached, closeCache };

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { settings, getUserDataPath } from './settings.js';
import { debugFactory } from './logger.js';

const debug = debugFactory('common.requestCache');

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
}

export class RequestCache {
  private db: DatabaseType | undefined;
  private purgeTimer: NodeJS.Timeout | undefined;

  private async init(): Promise<DatabaseType | undefined> {
    const { requestCache } = settings;
    if (!requestCache || !requestCache.enabled) return undefined;
    if (this.db) return this.db;
    const baseDir = path.resolve(getUserDataPath());
    const dbPath = path.resolve(baseDir, requestCache.database);
    if (dbPath !== baseDir && !dbPath.startsWith(baseDir + path.sep)) {
      debug(`Invalid cache database path: ${requestCache.database}`);
      return undefined;
    }
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)'
    );
    return this.db;
  }

  private makeKey(type: string, domain: string): string {
    return `${type}:${domain}`;
  }

  async get(
    type: string,
    domain: string,
    cacheOpts: CacheOptions = {}
  ): Promise<string | undefined> {
    const { requestCache } = settings;
    const enabled = cacheOpts.enabled ?? requestCache.enabled;
    const ttl = cacheOpts.ttl ?? requestCache.ttl;
    const ttlMs = typeof ttl === 'number' && Number.isFinite(ttl) ? ttl * 1000 : undefined;
    if (!enabled) return undefined;
    const database = await this.init();
    if (!database) return undefined;
    const key = this.makeKey(type, domain);
    try {
      const row = database
        .prepare('SELECT response, timestamp FROM cache WHERE key = ?')
        .get(key) as { response: string; timestamp: number } | undefined;
      if (!row) return undefined;
      if (ttlMs !== undefined && Date.now() - row.timestamp > ttlMs) {
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

  async set(
    type: string,
    domain: string,
    response: string,
    cacheOpts: CacheOptions = {}
  ): Promise<void> {
    const { requestCache } = settings;
    const enabled = cacheOpts.enabled ?? requestCache.enabled;
    if (!enabled) return;
    const database = await this.init();
    if (!database) return;
    const key = this.makeKey(type, domain);
    try {
      database
        .prepare('INSERT OR REPLACE INTO cache(key, response, timestamp) VALUES(?, ?, ?)')
        .run(key, response, Date.now());
      debug(`Cached response for ${key}`);
      const max = requestCache.maxEntries;
      if (max && max > 0) {
        const total = database.prepare('SELECT COUNT(*) as count FROM cache').get() as {
          count: number;
        };
        if (total.count > max) {
          const toDelete = total.count - max;
          database
            .prepare(
              'DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY timestamp ASC LIMIT ?)'
            )
            .run(toDelete);
          debug(`Evicted ${toDelete} oldest cache entries`);
        }
      }
    } catch (e) {
      debug(`Cache set failed: ${e}`);
    }
  }

  async delete(type: string, domain: string, cacheOpts: CacheOptions = {}): Promise<void> {
    const { requestCache } = settings;
    const enabled = cacheOpts.enabled ?? requestCache.enabled;
    if (!enabled) return;
    const database = await this.init();
    if (!database) return;
    const key = this.makeKey(type, domain);
    try {
      database.prepare('DELETE FROM cache WHERE key = ?').run(key);
      debug(`Deleted cache entry for ${key}`);
    } catch (e) {
      debug(`Cache delete failed: ${e}`);
    }
  }

  async purgeExpired(): Promise<number> {
    const { requestCache } = settings;
    if (!requestCache.enabled) return 0;
    const database = await this.init();
    if (!database) return 0;
    try {
      const threshold = Date.now() - requestCache.ttl * 1000;
      const res = database.prepare('DELETE FROM cache WHERE timestamp <= ?').run(threshold);
      debug(`Purged ${res.changes} expired entries`);
      return res.changes ?? 0;
    } catch (e) {
      debug(`Cache purge failed: ${e}`);
      return 0;
    }
  }

  async clear(): Promise<void> {
    const { requestCache } = settings;
    if (!requestCache.enabled) return;
    const database = await this.init();
    if (!database) return;
    try {
      database.prepare('DELETE FROM cache').run();
      debug('Cleared all cache entries');
    } catch (e) {
      debug(`Cache clear failed: ${e}`);
    }
  }

  startAutoPurge(intervalMs?: number): void {
    const { requestCache } = settings;
    const interval = intervalMs ?? requestCache.purgeInterval;
    if (!requestCache.enabled || !interval || interval <= 0) return;
    if (this.purgeTimer) clearInterval(this.purgeTimer);
    this.purgeTimer = setInterval(() => {
      void this.purgeExpired();
    }, interval);
    this.purgeTimer.unref?.();
  }

  close(): void {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = undefined;
    }
    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        debug(`Cache close failed: ${e}`);
      }
      this.db = undefined;
    }
  }
}

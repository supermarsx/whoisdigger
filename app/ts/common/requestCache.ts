import { cacheGet, cacheSet, cacheClear } from './tauriBridge.js';

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
}

export class RequestCache {
  async get(
    type: string,
    domain: string,
    cacheOpts: CacheOptions = {}
  ): Promise<string | undefined> {
    return await cacheGet(type, domain, cacheOpts);
  }

  async set(
    type: string,
    domain: string,
    response: string,
    cacheOpts: CacheOptions = {}
  ): Promise<void> {
    await cacheSet(type, domain, response, cacheOpts);
  }

  async delete(type: string, domain: string, cacheOpts: CacheOptions = {}): Promise<void> {
    // TODO: implement in main.rs if needed
  }

  async purgeExpired(): Promise<number> {
    // Backend handles this usually, but we can trigger it
    return 0;
  }

  async clear(): Promise<void> {
    await cacheClear();
  }

  startAutoPurge(intervalMs?: number): void {
    // Backend logic
  }

  close(): void {
    // No-op in Tauri
  }
}
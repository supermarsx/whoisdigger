const electron = (window as any).electron;

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
    if (electron) {
      return await electron.invoke('cache:get', type, domain, cacheOpts);
    }
    return undefined;
  }

  async set(
    type: string,
    domain: string,
    response: string,
    cacheOpts: CacheOptions = {}
  ): Promise<void> {
    if (electron) {
      await electron.invoke('cache:set', type, domain, response, cacheOpts);
    }
  }

  async delete(type: string, domain: string, cacheOpts: CacheOptions = {}): Promise<void> {
    // TODO: implement in main.rs if needed
  }

  async purgeExpired(): Promise<number> {
    // Backend handles this usually, but we can trigger it
    return 0;
  }

  async clear(): Promise<void> {
    if (electron) {
      await electron.invoke('cache:clear');
    }
  }

  startAutoPurge(intervalMs?: number): void {
    // Backend logic
  }

  close(): void {
    // No-op in Tauri
  }
}
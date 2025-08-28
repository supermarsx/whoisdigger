import '../test/electronMock';
import { loadSettings, settings, getUserDataPath } from '../app/ts/renderer/settings-renderer';
import { RequestCache } from '../app/ts/common/requestCache';
import fs from 'fs';
import path from 'path';

describe('requestCache', () => {
  const dbFile = 'test-cache.sqlite';
  let cache: RequestCache;

  beforeAll(async () => {
    await loadSettings();
    settings.requestCache.enabled = true;
    settings.requestCache.database = dbFile;
    settings.requestCache.ttl = 1;
    settings.requestCache.maxEntries = 100;
    cache = new RequestCache();
  });

  afterAll(() => {
    // Close DB before removing files on Windows
    cache.close();
    const dbPath = path.resolve(getUserDataPath(), dbFile);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const evilPath = path.resolve(getUserDataPath(), '../evil.sqlite');
    if (fs.existsSync(evilPath)) fs.unlinkSync(evilPath);
    settings.requestCache.enabled = false;
  });

  test('rejects paths outside user data directory', async () => {
    const original = settings.requestCache.database;
    settings.requestCache.database = '../evil.sqlite';
    const evilPath = path.resolve(getUserDataPath(), '../evil.sqlite');
    await cache.set('whois', 'evil.com', 'bad');
    expect(fs.existsSync(evilPath)).toBe(false);
    settings.requestCache.database = original;
  });

  test('stores and retrieves cached value', async () => {
    await cache.set('whois', 'example.com', 'cached-data');
    const res = await cache.get('whois', 'example.com');
    expect(res).toBe('cached-data');
  });

  test('expires entries after ttl', async () => {
    await cache.set('whois', 'expire.com', 'data');
    await new Promise((r) => setTimeout(r, 1100));
    const res = await cache.get('whois', 'expire.com');
    expect(res).toBeUndefined();
  });

  test('closeCache does not throw when cache disabled', () => {
    settings.requestCache.enabled = false;
    expect(() => cache.close()).not.toThrow();
  });

  test('purgeExpired removes outdated entries', async () => {
    settings.requestCache.enabled = true;
    await cache.set('whois', 'old.com', 'data');
    await new Promise((r) => setTimeout(r, 1100));
    await cache.purgeExpired();
    const res = await cache.get('whois', 'old.com');
    expect(res).toBeUndefined();
  });

  test('clearCache wipes all entries', async () => {
    await cache.set('whois', 'a.com', '1');
    await cache.set('whois', 'b.com', '2');
    await cache.clear();
    expect(await cache.get('whois', 'a.com')).toBeUndefined();
    expect(await cache.get('whois', 'b.com')).toBeUndefined();
  });

  test('evicts oldest entries when exceeding maxEntries', async () => {
    settings.requestCache.maxEntries = 2;
    await cache.clear();
    await cache.set('whois', 'a.com', '1');
    await cache.set('whois', 'b.com', '2');
    await cache.set('whois', 'c.com', '3');
    expect(await cache.get('whois', 'a.com')).toBeUndefined();
    expect(await cache.get('whois', 'b.com')).toBe('2');
    expect(await cache.get('whois', 'c.com')).toBe('3');
    settings.requestCache.maxEntries = 100;
  });

  test('startAutoPurge unrefs timer and close clears interval', () => {
    settings.requestCache.enabled = true;
    const testCache = new RequestCache();
    const timer = { unref: jest.fn() } as unknown as NodeJS.Timeout;
    const si = jest.spyOn(global, 'setInterval').mockReturnValue(timer);
    const ci = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    testCache.startAutoPurge(100);
    expect(timer.unref).toHaveBeenCalled();
    testCache.close();
    expect(ci).toHaveBeenCalledWith(timer);
    si.mockRestore();
    ci.mockRestore();
  });
});

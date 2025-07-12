import '../test/electronMock';
import { settings, getUserDataPath } from '../app/ts/renderer/settings-renderer';
import { RequestCache } from '../app/ts/common/requestCache';
import fs from 'fs';
import path from 'path';

describe('requestCache', () => {
  const dbFile = 'test-cache.sqlite';
  let cache: RequestCache;

  beforeAll(() => {
    settings.requestCache.enabled = true;
    settings.requestCache.database = dbFile;
    settings.requestCache.ttl = 1;
    cache = new RequestCache();
  });

  afterAll(() => {
    const dbPath = path.resolve(getUserDataPath(), dbFile);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const evilPath = path.resolve(getUserDataPath(), '../evil.sqlite');
    if (fs.existsSync(evilPath)) fs.unlinkSync(evilPath);
    settings.requestCache.enabled = false;
    cache.close();
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
});

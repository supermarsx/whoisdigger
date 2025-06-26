import '../test/electronMock';
import { settings, getUserDataPath } from '../app/ts/common/settings';
import {
  getCached,
  setCached,
  closeCache,
  purgeExpired,
  clearCache
} from '../app/ts/common/requestCache';
import fs from 'fs';
import path from 'path';

describe('requestCache', () => {
  const dbFile = 'test-cache.sqlite';

  beforeAll(() => {
    settings.requestCache.enabled = true;
    settings.requestCache.database = dbFile;
    settings.requestCache.ttl = 1;
  });

  afterAll(() => {
    const dbPath = path.resolve(getUserDataPath(), dbFile);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const evilPath = path.resolve(getUserDataPath(), '../evil.sqlite');
    if (fs.existsSync(evilPath)) fs.unlinkSync(evilPath);
    settings.requestCache.enabled = false;
  });

  test('rejects paths outside user data directory', () => {
    const original = settings.requestCache.database;
    settings.requestCache.database = '../evil.sqlite';
    const evilPath = path.resolve(getUserDataPath(), '../evil.sqlite');
    setCached('whois', 'evil.com', 'bad');
    expect(fs.existsSync(evilPath)).toBe(false);
    settings.requestCache.database = original;
  });

  test('stores and retrieves cached value', () => {
    setCached('whois', 'example.com', 'cached-data');
    const res = getCached('whois', 'example.com');
    expect(res).toBe('cached-data');
  });

  test('expires entries after ttl', async () => {
    setCached('whois', 'expire.com', 'data');
    await new Promise((r) => setTimeout(r, 1100));
    const res = getCached('whois', 'expire.com');
    expect(res).toBeUndefined();
  });

  test('closeCache does not throw when cache disabled', () => {
    settings.requestCache.enabled = false;
    expect(() => closeCache()).not.toThrow();
  });

  test('purgeExpired removes outdated entries', async () => {
    settings.requestCache.enabled = true;
    setCached('whois', 'old.com', 'data');
    await new Promise((r) => setTimeout(r, 1100));
    purgeExpired();
    const res = getCached('whois', 'old.com');
    expect(res).toBeUndefined();
  });

  test('clearCache wipes all entries', () => {
    setCached('whois', 'a.com', '1');
    setCached('whois', 'b.com', '2');
    clearCache();
    expect(getCached('whois', 'a.com')).toBeUndefined();
    expect(getCached('whois', 'b.com')).toBeUndefined();
  });
});

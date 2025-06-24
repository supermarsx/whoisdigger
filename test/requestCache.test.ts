import '../test/electronMock';
import { settings } from '../app/ts/common/settings';
import { getCached, setCached } from '../app/ts/common/requestCache';
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
    const dbPath = path.join(path.resolve('.'), dbFile);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    settings.requestCache.enabled = false;
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
});

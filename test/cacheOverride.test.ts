import '../test/electronMock';
import fs from 'fs';
import path from 'path';
import whois from 'whois';
import dns from 'dns/promises';
import { lookup } from '../app/ts/common/lookup';
import { nsLookup } from '../app/ts/common/dnsLookup';
import { settings, getUserDataPath } from '../app/ts/renderer/settings-renderer';

describe('cache override', () => {
  const dbFile = 'override-cache.sqlite';

  beforeAll(() => {
    settings.requestCache.enabled = true;
    settings.requestCache.database = dbFile;
    settings.requestCache.ttl = 60;
  });

  afterAll(() => {
    const dbPath = path.resolve(getUserDataPath(), dbFile);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    settings.requestCache.enabled = false;
  });

  test('whois lookup bypasses cache when disabled', async () => {
    const spy = jest.spyOn(whois, 'lookup').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1] as Function;
      cb(null, 'DATA');
    });
    await lookup('example.com', undefined, { enabled: false });
    await lookup('example.com', undefined, { enabled: false });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  test('dns lookup bypasses cache when disabled', async () => {
    const spy = jest.spyOn(dns, 'resolve').mockResolvedValue(['ns1']);
    await nsLookup('example.com', { enabled: false });
    await nsLookup('example.com', { enabled: false });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  test('whois lookup ttl override forces refresh', async () => {
    const spy = jest.spyOn(whois, 'lookup').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1] as Function;
      cb(null, 'DATA');
    });
    await lookup('ttl.com', undefined, { ttl: 0 });
    await lookup('ttl.com', undefined, { ttl: 0 });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  test('dns lookup ttl override forces refresh', async () => {
    const spy = jest.spyOn(dns, 'resolve').mockResolvedValue(['ns1']);
    await nsLookup('ttl.com', { ttl: 0 });
    await nsLookup('ttl.com', { ttl: 0 });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

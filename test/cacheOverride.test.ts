import '../test/electronMock';
import fs from 'fs';
import path from 'path';
import whois from 'whois';
import dns from 'dns/promises';
import { lookup } from '../app/ts/common/lookup';
import { nsLookup } from '../app/ts/common/dnsLookup';
import { loadSettings, settings, getUserDataPath } from '../app/ts/renderer/settings-renderer';
import { requestCache } from '../app/ts/common/requestCacheSingleton';

describe('cache override', () => {
  const dbFile = 'override-cache.sqlite';

  beforeAll(async () => {
    await loadSettings();
    settings.requestCache.enabled = true;
    settings.requestCache.database = dbFile;
    settings.requestCache.ttl = 60;
  });

  afterAll(() => {
    // ensure DB is not locked on Windows
    settings.requestCache.enabled = false;
    requestCache.close();
    const dbPath = path.resolve(getUserDataPath(), dbFile);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
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

  test('whois lookup on converted domain hits cache', async () => {
    const prev = { ...settings.lookupConversion };
    settings.lookupConversion.enabled = true;
    settings.lookupConversion.algorithm = 'punycode';
    const spy = jest.spyOn(whois, 'lookup').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1] as Function;
      cb(null, 'DATA');
    });
    await lookup('täst.de');
    await lookup('xn--tst-qla.de');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    settings.lookupConversion.enabled = prev.enabled;
    settings.lookupConversion.algorithm = prev.algorithm;
  });
});

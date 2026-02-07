/**
 * Tests for lookup module (app/ts/common/lookup.ts)
 * Focuses on convertDomain and getWhoisOptions (pure logic).
 * The actual WHOIS lookup is integration-heavy so we mock it.
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/requestCacheSingleton.js', () => ({
  requestCache: {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../app/ts/common/proxy.js', () => ({
  getProxy: jest.fn(() => undefined),
}));

jest.mock('../app/ts/utils/random.js', () => ({
  randomInt: (min: number, max: number) => min,
}));

jest.mock('whois', () => ({
  lookup: jest.fn((_domain: string, _opts: unknown, cb: Function) => {
    cb(null, 'Mock WHOIS response');
  }),
}));

jest.mock('psl', () => ({
  get: (domain: string) => domain,
}));

jest.mock('punycode', () => ({
  toASCII: (d: string) => `puny-${d}`,
}));

jest.mock('idna-uts46', () => ({
  toAscii: (d: string, _opts?: unknown) => `uts46-${d}`,
}));

const mockSettings = {
  lookupConversion: { enabled: false, algorithm: 'punycode' },
  lookupGeneral: {
    psl: false,
    server: undefined,
    follow: 2,
    timeout: 5000,
    verbose: false,
    timeBetween: 100,
  },
  lookupRandomizeFollow: { randomize: false, minimumDepth: 1, maximumDepth: 3 },
  lookupRandomizeTimeout: { randomize: false, minimum: 1000, maximum: 10000 },
  lookupRandomizeTimeBetween: { randomize: false, minimum: 50, maximum: 500 },
  lookupProxy: { enable: false },
};

jest.mock('../app/ts/common/settings.js', () => ({
  get settings() {
    return mockSettings;
  },
  Settings: class {},
}));

import { convertDomain, getWhoisOptions, lookup, WhoisOption } from '../app/ts/common/lookup.js';

describe('convertDomain', () => {
  it('returns domain unchanged for unknown mode', () => {
    expect(convertDomain('example.com', 'unknown')).toBe('example.com');
  });

  it('converts with punycode', () => {
    expect(convertDomain('ünïcödé.com', 'punycode')).toBe('puny-ünïcödé.com');
  });

  it('converts with uts46', () => {
    expect(convertDomain('ünïcödé.com', 'uts46')).toBe('uts46-ünïcödé.com');
  });

  it('converts with uts46-transitional', () => {
    expect(convertDomain('test.com', 'uts46-transitional')).toBe('uts46-test.com');
  });

  it('strips non-ASCII with ascii mode', () => {
    expect(convertDomain('tëst.com', 'ascii')).toBe('tst.com');
  });

  it('preserves ASCII domain in ascii mode', () => {
    expect(convertDomain('example.com', 'ascii')).toBe('example.com');
  });

  it('uses settings algorithm when no mode given', () => {
    mockSettings.lookupConversion.algorithm = 'punycode';
    expect(convertDomain('test.com')).toBe('puny-test.com');
  });
});

describe('getWhoisOptions', () => {
  beforeEach(() => {
    mockSettings.lookupGeneral = {
      server: undefined,
      follow: 2,
      timeout: 5000,
      verbose: false,
      timeBetween: 100,
    };
    mockSettings.lookupRandomizeFollow.randomize = false;
    mockSettings.lookupRandomizeTimeout.randomize = false;
    mockSettings.lookupProxy = { enable: false };
  });

  it('returns options from general settings', () => {
    const opts = getWhoisOptions();
    expect(opts.follow).toBe(2);
    expect(opts.timeout).toBe(5000);
    expect(opts.verbose).toBe(false);
  });

  it('includes proxy when enabled', () => {
    const { getProxy } = require('../app/ts/common/proxy.js');
    getProxy.mockReturnValue({ ipaddress: '1.2.3.4', port: 8080 });
    const opts = getWhoisOptions();
    expect(opts.proxy).toEqual({ ipaddress: '1.2.3.4', port: 8080 });
  });

  it('uses random follow when enabled', () => {
    mockSettings.lookupRandomizeFollow.randomize = true;
    mockSettings.lookupRandomizeFollow.minimumDepth = 1;
    mockSettings.lookupRandomizeFollow.maximumDepth = 5;
    const opts = getWhoisOptions();
    expect(opts.follow).toBe(1); // randomInt mock returns min
  });

  it('uses random timeout when enabled', () => {
    mockSettings.lookupRandomizeTimeout.randomize = true;
    mockSettings.lookupRandomizeTimeout.minimum = 2000;
    mockSettings.lookupRandomizeTimeout.maximum = 8000;
    const opts = getWhoisOptions();
    expect(opts.timeout).toBe(2000); // randomInt mock returns min
  });
});

describe('WhoisOption enum', () => {
  it('has expected values', () => {
    expect(WhoisOption.Follow).toBeDefined();
    expect(WhoisOption.Timeout).toBeDefined();
    expect(WhoisOption.TimeBetween).toBeDefined();
  });
});

describe('lookup()', () => {
  beforeEach(() => {
    mockSettings.lookupConversion.enabled = false;
    mockSettings.lookupGeneral.psl = false;
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue(undefined);
  });

  it('returns WHOIS response from lookup', async () => {
    const result = await lookup('example.com');
    expect(result).toBe('Mock WHOIS response');
  });

  it('returns cached response if available', async () => {
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue('cached response');
    const result = await lookup('example.com');
    expect(result).toBe('cached response');
  });

  it('caches successful lookups', async () => {
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    await lookup('test.com');
    expect(requestCache.set).toHaveBeenCalledWith('whois', 'test.com', 'Mock WHOIS response', {});
  });

  it('does not cache failed lookups', async () => {
    const whois = require('whois');
    whois.lookup.mockImplementationOnce(
      (_d: string, _o: unknown, cb: Function) => cb(new Error('network error'))
    );
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.set.mockClear();
    const result = await lookup('fail.com');
    expect(result).toContain('Whois lookup error');
    expect(requestCache.set).not.toHaveBeenCalled();
  });
});

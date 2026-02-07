/**
 * Tests for dnsLookup module (app/ts/common/dnsLookup.ts)
 *
 * Tests isDomainAvailable (pure logic) and hasNsServers/nsLookup (with mocks).
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/settings.js', () => ({
  settings: {
    lookupConversion: { enabled: false },
    lookupGeneral: { psl: false },
  },
  Settings: class {},
}));

jest.mock('../app/ts/common/requestCacheSingleton.js', () => ({
  requestCache: {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../app/ts/common/lookup.js', () => ({
  convertDomain: (d: string) => d,
}));

jest.mock('psl', () => ({
  get: (domain: string) => domain,
}));

jest.mock('dns/promises', () => ({
  resolve: jest.fn(),
}));

import { isDomainAvailable, hasNsServers, nsLookup } from '../app/ts/common/dnsLookup.js';
import { DnsLookupError } from '../app/ts/common/errors.js';
import DomainStatus from '../app/ts/common/status.js';

const mockDnsResolve = jest.requireMock<{ resolve: jest.Mock }>('dns/promises').resolve;

describe('isDomainAvailable()', () => {
  it('returns Unavailable when DNS has results (domain exists)', () => {
    const result = isDomainAvailable({ ok: true, value: true });
    expect(result).toBe(DomainStatus.Unavailable);
  });

  it('returns Available when DNS has no results', () => {
    const result = isDomainAvailable({ ok: true, value: false });
    expect(result).toBe(DomainStatus.Available);
  });

  it('returns Error when lookup failed', () => {
    const result = isDomainAvailable({
      ok: false,
      error: new DnsLookupError('NXDOMAIN'),
    });
    expect(result).toBe(DomainStatus.Error);
  });
});

describe('nsLookup()', () => {
  beforeEach(() => {
    mockDnsResolve.mockReset();
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue(undefined);
    requestCache.set.mockResolvedValue(undefined);
  });

  it('returns nameservers on success', async () => {
    mockDnsResolve.mockResolvedValue(['ns1.example.com', 'ns2.example.com']);
    const result = await nsLookup('example.com');
    expect(result).toEqual(['ns1.example.com', 'ns2.example.com']);
  });

  it('throws DnsLookupError on failure', async () => {
    mockDnsResolve.mockRejectedValue(new Error('NXDOMAIN'));
    await expect(nsLookup('nonexistent.example')).rejects.toThrow(DnsLookupError);
  });

  it('uses cache when available', async () => {
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue(JSON.stringify(['ns1.cached.com']));
    const result = await nsLookup('cached.com');
    expect(result).toEqual(['ns1.cached.com']);
    expect(mockDnsResolve).not.toHaveBeenCalled();
  });

  it('caches successful lookups', async () => {
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    mockDnsResolve.mockResolvedValue(['ns1.test.com']);
    await nsLookup('test.com');
    expect(requestCache.set).toHaveBeenCalledWith(
      'dns',
      'test.com',
      JSON.stringify(['ns1.test.com']),
      {}
    );
  });

  it('handles corrupted cache gracefully', async () => {
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue('not-valid-json');
    mockDnsResolve.mockResolvedValue(['ns1.test.com']);
    const result = await nsLookup('test.com');
    expect(result).toEqual(['ns1.test.com']);
    // Should have deleted the corrupt cache entry
    expect(requestCache.delete).toHaveBeenCalledWith('dns', 'test.com', {});
  });
});

describe('hasNsServers()', () => {
  beforeEach(() => {
    mockDnsResolve.mockReset();
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue(undefined);
  });

  it('returns ok:true, value:true when NS records exist', async () => {
    mockDnsResolve.mockResolvedValue(['ns1.example.com']);
    const result = await hasNsServers('example.com');
    expect(result).toEqual({ ok: true, value: true });
  });

  it('returns ok:true, value:false when no NS records', async () => {
    mockDnsResolve.mockResolvedValue([]);
    const result = await hasNsServers('empty.com');
    expect(result).toEqual({ ok: true, value: false });
  });

  it('returns ok:false on lookup failure', async () => {
    mockDnsResolve.mockRejectedValue(new Error('SERVFAIL'));
    const result = await hasNsServers('fail.com');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(DnsLookupError);
    }
  });
});

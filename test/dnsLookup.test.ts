import '../test/electronMock';

import dns from 'dns/promises';
import { nsLookup, hasNsServers, isDomainAvailable } from '../app/ts/common/dnsLookup';
import DomainStatus from '../app/ts/common/status';
import { DnsLookupError } from '../app/ts/common/errors';

describe('dnsLookup', () => {
  let resolveMock: jest.SpyInstance;

  beforeAll(() => {
    resolveMock = jest.spyOn(dns, 'resolve').mockRejectedValue(new Error('ENOTFOUND'));
  });

  afterAll(() => {
    resolveMock.mockRestore();
  });

  test('nsLookup handles invalid domain', async () => {
    await expect(nsLookup('invalid_domain')).rejects.toBeInstanceOf(DnsLookupError);
  });

  test('nsLookup returns server list for valid domain', async () => {
    const servers = ['ns1.example.com', 'ns2.example.com'];
    resolveMock.mockResolvedValueOnce(servers);
    const result = await nsLookup('example.com');
    expect(result).toEqual(servers);
  });

  test('hasNsServers handles invalid domain', async () => {
    const result = await hasNsServers('invalid_domain');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errorResult = result as { ok: false; error: DnsLookupError };
      expect(errorResult.error).toBeInstanceOf(DnsLookupError);
    }
  });

  test('hasNsServers returns true when records exist', async () => {
    const servers = ['ns1.example.com'];
    resolveMock.mockResolvedValueOnce(servers);
    const result = await hasNsServers('example.com');
    expect(result).toEqual({ ok: true, value: true });
  });

  test('isDomainAvailable returns unavailable for true', () => {
    expect(isDomainAvailable({ ok: true, value: true })).toBe(DomainStatus.Unavailable);
  });

  test('isDomainAvailable returns available for false', () => {
    expect(isDomainAvailable({ ok: true, value: false })).toBe(DomainStatus.Available);
  });

  test("isDomainAvailable returns 'error' on error result", () => {
    const error = new DnsLookupError('fail');
    expect(isDomainAvailable({ ok: false, error })).toBe(DomainStatus.Error);
  });
});

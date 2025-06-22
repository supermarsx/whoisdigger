jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: jest.fn().mockReturnValue('') } }
}));

import dns from 'dns';
import { nsLookup, hasNsServers, isDomainAvailable } from '../app/ts/common/dnsLookup';

describe('dnsLookup', () => {
  let resolveMock: jest.SpyInstance;

  beforeAll(() => {
    resolveMock = jest.spyOn(dns, 'resolve').mockImplementation((_: string, __: string, cb: Function) => {
      cb(new Error('ENOTFOUND'));
    });
  });

  afterAll(() => {
    resolveMock.mockRestore();
  });

  test('nsLookup handles invalid domain', async () => {
    const result = await nsLookup('invalid_domain');
    expect(result).toBe('error');
  });

  test('hasNsServers handles invalid domain', async () => {
    const result = await hasNsServers('invalid_domain');
    expect(result).toBe(false);
  });

  test('isDomainAvailable returns unavailable for true', () => {
    expect(isDomainAvailable(true)).toBe('unavailable');
  });

  test('isDomainAvailable returns available for false', () => {
    expect(isDomainAvailable(false)).toBe('available');
  });

  test("isDomainAvailable returns 'error' on error string", () => {
    expect(isDomainAvailable('error')).toBe('error');
  });

  test('isDomainAvailable treats unknown strings as error', () => {
    expect(isDomainAvailable('unknown')).toBe('error');
  });
});

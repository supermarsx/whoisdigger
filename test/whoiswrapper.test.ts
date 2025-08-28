/** @jest-environment jsdom */
import '../test/electronMock';

import whois from 'whois';
import { lookup, getWhoisOptions, WhoisOption } from '../app/ts/common/lookup';
import { toJSON } from '../app/ts/common/parser';
import { RequestCache } from '../app/ts/common/requestCache';

describe('whoiswrapper', () => {
  let lookupMock: jest.SpyInstance;

  beforeAll(() => {
    lookupMock = jest.spyOn(whois, 'lookup').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1] as Function;
      cb(new Error('lookup failed'));
    });
  });

  afterAll(() => {
    lookupMock.mockRestore();
  });

  test('lookup handles invalid domain', async () => {
    await expect(lookup('invalid_domain')).resolves.toContain('Whois lookup error');
  });

  test('failed lookups are not cached', async () => {
    const cacheSpy = jest.spyOn(RequestCache.prototype, 'set');
    await lookup('invalid_domain');
    expect(cacheSpy).not.toHaveBeenCalled();
    cacheSpy.mockRestore();
  });

  test('toJSON parses object arrays', () => {
    const input = [{ data: 'Domain Name: example.com\nRegistrar: Example' }];
    const result = toJSON(input);
    expect(result).toEqual([{ data: { domainName: 'example.com', registrar: 'Example' } }]);
  });

  test('toJSON returns "timeout" for timeout strings', () => {
    const result = toJSON('lookup: timeout');
    expect(result).toBe('timeout');
  });

  test('getWhoisOptions uses enum parameters', () => {
    const opts = getWhoisOptions();
    expect(typeof opts.follow).toBe('number');
    expect(typeof opts.timeout).toBe('number');
    expect(Object.values(WhoisOption)).toContain(WhoisOption.Follow);
  });
});

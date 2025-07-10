import '../test/electronMock';

import { buildPatterns, checkPatterns } from '../app/ts/common/whoiswrapper/patterns';
import { builtPatterns } from '../app/ts/common/whoiswrapper/patterns';
import { settings } from '../app/ts/common/settings';
import DomainStatus from '../app/ts/common/status';

const electron = (global as any).window.electron;

describe('whois patterns', () => {
  beforeAll(() => {
    buildPatterns();
  });

  test('buildPatterns populates collections', () => {
    expect(builtPatterns.available.length).toBeGreaterThan(0);
    expect(builtPatterns.unavailable.length).toBeGreaterThan(0);
  });

  test('detects available replies', () => {
    const reply = 'No match for domain "example.com".';
    expect(checkPatterns(reply)).toBe(DomainStatus.Available);
  });

  test('detects unavailable replies', () => {
    const reply = 'Domain Status:ok\nExpiration Date: 2099-01-01';
    expect(checkPatterns(reply)).toBe(DomainStatus.Unavailable);
  });

  test('detects rate limit errors', () => {
    const reply = 'Your connection limit exceeded.';
    expect(checkPatterns(reply)).toBe(DomainStatus.ErrorRateLimiting);
  });

  test('detects not found replies', () => {
    const reply = 'NOT FOUND';
    expect(checkPatterns(reply)).toBe(DomainStatus.Available);
  });

  test('returns error for empty replies', () => {
    expect(checkPatterns('')).toBe(DomainStatus.ErrorNoContent);
  });

  test('patterns are built in numeric order', () => {
    const ctxBase = { resultsJSON: {}, domainParams: {} as any, controlDate: undefined };
    const samples = ['NOT FOUND', 'Not found: ', ' not found'];
    samples.forEach((text, idx) => {
      const ctx = { ...ctxBase, resultsText: text } as any;
      expect(builtPatterns.available[idx].fn(ctx)).toBe(true);
    });
  });

  test('rebuilding after settings change affects results', () => {
    const handler = (electron.on as jest.Mock).mock.calls.find(
      (c) => c[0] === 'settings:reloaded'
    )?.[1] as () => void;
    expect(typeof handler).toBe('function');

    const reply = 'Uniregistry - Query limit exceeded';
    expect(checkPatterns(reply)).toBe(DomainStatus.Unavailable);

    settings.lookupAssumptions.uniregistry = false;
    handler();

    expect(checkPatterns(reply)).toBe(DomainStatus.ErrorRateLimiting);

    settings.lookupAssumptions.uniregistry = true;
    handler();
  });
});

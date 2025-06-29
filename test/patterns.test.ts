import '../test/electronMock';

import { buildPatterns, checkPatterns } from '../app/ts/common/whoiswrapper/patterns';
import { builtPatterns } from '../app/ts/common/whoiswrapper/patterns';

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
    expect(checkPatterns(reply)).toBe('available');
  });

  test('detects unavailable replies', () => {
    const reply = 'Domain Status:ok\nExpiration Date: 2099-01-01';
    expect(checkPatterns(reply)).toBe('unavailable');
  });

  test('detects rate limit errors', () => {
    const reply = 'Your connection limit exceeded.';
    expect(checkPatterns(reply)).toBe('error:ratelimiting');
  });

  test('detects not found replies', () => {
    const reply = 'NOT FOUND';
    expect(checkPatterns(reply)).toBe('available');
  });

  test('returns error for empty replies', () => {
    expect(checkPatterns('')).toBe('error:nocontent');
  });

  test('patterns are built in numeric order', () => {
    const ctxBase = { resultsJSON: {}, domainParams: {} as any, controlDate: undefined };
    const samples = ['NOT FOUND', 'Not found: ', ' not found'];
    samples.forEach((text, idx) => {
      const ctx = { ...ctxBase, resultsText: text } as any;
      expect(builtPatterns.available[idx].fn(ctx)).toBe(true);
    });
  });
});

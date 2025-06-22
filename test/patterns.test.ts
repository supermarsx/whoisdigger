jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: jest.fn().mockReturnValue('') } }
}));

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

  test('returns error for empty replies', () => {
    expect(checkPatterns('')).toBe('error:nocontent');
  });
});

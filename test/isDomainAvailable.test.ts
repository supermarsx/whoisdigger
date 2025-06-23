jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: jest.fn().mockReturnValue('') } }
}));
jest.mock('@electron/remote', () => ({
  app: { getPath: jest.fn().mockReturnValue('') }
}));

import { isDomainAvailable } from '../app/ts/common/whoiswrapper';

describe('isDomainAvailable', () => {
  test('detects available domains from no match message', () => {
    const reply = 'No match for domain "example.com".';
    expect(isDomainAvailable(reply)).toBe('available');
  });

  test('detects unavailable domains from whois data', () => {
    const reply = 'Domain Status:ok\nExpiration Date: 2099-01-01';
    expect(isDomainAvailable(reply)).toBe('unavailable');
  });

  test('handles rate limit messages', () => {
    const reply = 'Your connection limit exceeded.';
    expect(isDomainAvailable(reply)).toBe('error:ratelimiting');
  });

  test('returns error for empty replies', () => {
    expect(isDomainAvailable('')).toBe('error:nocontent');
  });
});

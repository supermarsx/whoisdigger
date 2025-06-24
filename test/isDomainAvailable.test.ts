import '../test/electronMock';

import { isDomainAvailable } from '../app/ts/common/availability';

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

  test('handles not found messages', () => {
    const reply = 'NOT FOUND';
    expect(isDomainAvailable(reply)).toBe('available');
  });

  test('returns error for empty replies', () => {
    expect(isDomainAvailable('')).toBe('error:nocontent');
  });
});

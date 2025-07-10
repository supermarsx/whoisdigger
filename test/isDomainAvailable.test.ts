import '../test/electronMock';

import { isDomainAvailable } from '../app/ts/common/availability';
import DomainStatus from '../app/ts/common/status';

describe('isDomainAvailable', () => {
  test('detects available domains from no match message', () => {
    const reply = 'No match for domain "example.com".';
    expect(isDomainAvailable(reply)).toBe(DomainStatus.Available);
  });

  test('detects unavailable domains from whois data', () => {
    const reply = 'Domain Status:ok\nExpiration Date: 2099-01-01';
    expect(isDomainAvailable(reply)).toBe(DomainStatus.Unavailable);
  });

  test('handles rate limit messages', () => {
    const reply = 'Your connection limit exceeded.';
    expect(isDomainAvailable(reply)).toBe(DomainStatus.ErrorRateLimiting);
  });

  test('handles not found messages', () => {
    const reply = 'NOT FOUND';
    expect(isDomainAvailable(reply)).toBe(DomainStatus.Available);
  });

  test('returns error for empty replies', () => {
    expect(isDomainAvailable('')).toBe(DomainStatus.ErrorNoContent);
  });
});

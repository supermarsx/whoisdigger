/**
 * Tests for app/ts/common/status.ts — DomainStatus enum
 */
import DomainStatus from '../app/ts/common/status.js';

describe('DomainStatus enum', () => {
  test('has correct string values', () => {
    expect(DomainStatus.Available).toBe('available');
    expect(DomainStatus.Unavailable).toBe('unavailable');
    expect(DomainStatus.Expired).toBe('expired');
    expect(DomainStatus.Error).toBe('error');
    expect(DomainStatus.ErrorNoContent).toBe('error:nocontent');
    expect(DomainStatus.ErrorUnauthorized).toBe('error:unauthorized');
    expect(DomainStatus.ErrorRateLimiting).toBe('error:ratelimiting');
    expect(DomainStatus.ErrorUnretrievable).toBe('error:unretrivable');
    expect(DomainStatus.ErrorForbidden).toBe('error:forbidden');
    expect(DomainStatus.ErrorReservedByRegulator).toBe('error:reservedbyregulator');
    expect(DomainStatus.ErrorUnregistrable).toBe('error:unregistrable');
    expect(DomainStatus.ErrorReplyError).toBe('error:replyerror');
    expect(DomainStatus.ErrorUnparsable).toBe('error:unparsable');
  });

  test('contains exactly 13 members', () => {
    const values = Object.values(DomainStatus).filter(
      (v) => typeof v === 'string'
    );
    expect(values).toHaveLength(13);
  });

  test('all error statuses start with "error"', () => {
    const errorStatuses = Object.values(DomainStatus).filter(
      (v) => typeof v === 'string' && v !== 'available' && v !== 'unavailable' && v !== 'expired'
    );
    for (const s of errorStatuses) {
      expect(s).toMatch(/^error/);
    }
  });

  test('has no duplicate values', () => {
    const values = Object.values(DomainStatus).filter((v) => typeof v === 'string');
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

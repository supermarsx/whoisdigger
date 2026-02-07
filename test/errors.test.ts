/**
 * Tests for errors module (app/ts/common/errors.ts)
 */

import { DnsLookupError } from '../app/ts/common/errors.js';
import type { Result } from '../app/ts/common/errors.js';

describe('DnsLookupError', () => {
  it('should be an instance of Error', () => {
    const err = new DnsLookupError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have the correct name', () => {
    const err = new DnsLookupError('lookup failed');
    expect(err.name).toBe('DnsLookupError');
  });

  it('should preserve the message', () => {
    const err = new DnsLookupError('NXDOMAIN for example.com');
    expect(err.message).toBe('NXDOMAIN for example.com');
  });

  it('should have a stack trace', () => {
    const err = new DnsLookupError('test');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('DnsLookupError');
  });

  it('should be catchable as Error', () => {
    try {
      throw new DnsLookupError('fail');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as DnsLookupError).name).toBe('DnsLookupError');
    }
  });
});

describe('Result type', () => {
  it('should represent a success', () => {
    const result: Result<string, Error> = { ok: true, value: 'data' };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('data');
    }
  });

  it('should represent a failure', () => {
    const result: Result<string, DnsLookupError> = {
      ok: false,
      error: new DnsLookupError('fail'),
    };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(DnsLookupError);
      expect(result.error.message).toBe('fail');
    }
  });

  it('should work as discriminated union', () => {
    function process(r: Result<number, Error>): string {
      if (r.ok) return `value: ${r.value}`;
      return `error: ${r.error.message}`;
    }
    expect(process({ ok: true, value: 42 })).toBe('value: 42');
    expect(process({ ok: false, error: new Error('bad') })).toBe('error: bad');
  });
});

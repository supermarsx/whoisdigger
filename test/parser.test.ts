/**
 * Tests for app/ts/common/parser.ts — parseRawData, toJSON, camelCase, preStringStrip
 */
jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {}
}));

import { parseRawData, toJSON, preStringStrip } from '../app/ts/common/parser.js';

describe('preStringStrip', () => {
  test('replaces single tab after colon', () => {
    expect(preStringStrip('Domain:\tValue')).toBe('Domain: Value');
  });

  test('replaces double tab after colon', () => {
    expect(preStringStrip('Domain:\t\tValue')).toBe('Domain: Value');
  });

  test('leaves strings without tabs unchanged', () => {
    expect(preStringStrip('Domain: Value')).toBe('Domain: Value');
  });

  test('handles multiple occurrences', () => {
    expect(preStringStrip('A:\tB\nC:\t\tD')).toBe('A: B\nC: D');
  });
});

describe('parseRawData', () => {
  test('parses standard WHOIS key-value pairs', () => {
    const raw = 'Domain Name: example.com\nRegistrar: GoDaddy LLC';
    const result = parseRawData(raw);
    expect(result.domainName).toBe('example.com');
    expect(result.registrar).toBe('GoDaddy LLC');
  });

  test('handles CRLF line endings', () => {
    const raw = 'Domain Name: test.com\r\nRegistrar: Namecheap';
    const result = parseRawData(raw);
    expect(result.domainName).toBe('test.com');
    expect(result.registrar).toBe('Namecheap');
  });

  test('handles CR-only line endings', () => {
    const raw = 'Domain Name: test.com\rRegistrar: Namecheap';
    const result = parseRawData(raw);
    expect(result.domainName).toBe('test.com');
    expect(result.registrar).toBe('Namecheap');
  });

  test('returns empty object for empty input', () => {
    expect(parseRawData('')).toEqual({});
  });

  test('returns empty object for input without colons', () => {
    expect(parseRawData('no colons here')).toEqual({});
  });

  test('ignores lines with colon but no space after', () => {
    expect(parseRawData('Key:Value')).toEqual({});
  });

  test('merges duplicate keys by appending', () => {
    const raw = 'Name Server: ns1.example.com\nName Server: ns2.example.com';
    const result = parseRawData(raw);
    expect(result.nameServer).toBe('ns1.example.com ns2.example.com');
  });

  test('decodes HTML entities', () => {
    const raw = 'Registrar: ABC &amp; Co';
    const result = parseRawData(raw);
    expect(result.registrar).toBe('ABC & Co');
  });

  test('handles colons in values (URLs)', () => {
    const raw = 'Registrar URL: https://www.example.com';
    const result = parseRawData(raw);
    expect(result.registrarURL).toBe('https://www.example.com');
  });

  test('trims whitespace from lines', () => {
    const raw = '   Domain Name: example.com   \n   Registrar: Test   ';
    const result = parseRawData(raw);
    expect(result.domainName).toBe('example.com');
  });

  test('converts keys to camelCase', () => {
    const raw = 'Creation-Date: 2020-01-01\nUpdated Date: 2023-06-01';
    const result = parseRawData(raw);
    expect(result.creationDate).toBe('2020-01-01');
    expect(result.updatedDate).toBe('2023-06-01');
  });

  test('handles multiline WHOIS with blank lines', () => {
    const raw =
      'Domain Name: example.com\n\nRegistrar: GoDaddy\n\n   \nCreation Date: 2020-01-01';
    const result = parseRawData(raw);
    expect(result.domainName).toBe('example.com');
    expect(result.registrar).toBe('GoDaddy');
    expect(result.creationDate).toBe('2020-01-01');
  });

  test('handles keys with special leading characters', () => {
    const raw = '% Domain Name: test.com';
    const result = parseRawData(raw);
    // The % should be stripped by camelCase
    expect(result.domainName).toBe('test.com');
  });

  test('handles large input without error', () => {
    const line = 'Key: ' + 'a'.repeat(10000);
    const result = parseRawData(line);
    expect(result.key).toHaveLength(10000);
  });
});

describe('toJSON', () => {
  test('returns empty object for null', () => {
    expect(toJSON(null)).toEqual({});
  });

  test('returns empty object for undefined', () => {
    expect(toJSON(undefined)).toEqual({});
  });

  test('returns "timeout" for timeout string', () => {
    expect(toJSON('lookup: timeout')).toBe('timeout');
  });

  test('parses a normal WHOIS string', () => {
    const result = toJSON('Domain Name: example.com\nRegistrar: Test');
    expect(result).toEqual(
      expect.objectContaining({
        domainName: 'example.com',
        registrar: 'Test'
      })
    );
  });

  test('returns object as-is when given an object', () => {
    const obj = { key: 'value' };
    expect(toJSON(obj)).toBe(obj);
  });

  test('processes array of data items', () => {
    const arr = [
      { data: 'Domain Name: a.com' },
      { data: 'Domain Name: b.com' }
    ];
    const result = toJSON(arr as any);
    // After processing, data should be parsed
    expect(Array.isArray(result)).toBe(true);
  });

  test('handles array items that are already objects', () => {
    const arr = [
      { data: { domainName: 'already.parsed' } }
    ];
    const result = toJSON(arr as any);
    expect(Array.isArray(result)).toBe(true);
  });

  test('handles empty string', () => {
    const result = toJSON('');
    expect(result).toEqual({});
  });
});

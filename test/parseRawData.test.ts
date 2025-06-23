import parseRawData from '../app/ts/common/parseRawData';

describe('parseRawData', () => {
  test('parses key value pairs with LF newlines', () => {
    const raw = 'Domain Name: example.com\nRegistrar: Example';
    const result = parseRawData(raw);
    expect(result).toEqual({ domainName: 'example.com', registrar: 'Example' });
  });

  test('parses key value pairs with CRLF newlines', () => {
    const raw = 'Domain Name: example.com\r\nRegistrar: Example';
    const result = parseRawData(raw);
    expect(result).toEqual({ domainName: 'example.com', registrar: 'Example' });
  });

  test('parses key value pairs with CR newlines', () => {
    const raw = 'Domain Name: example.com\rRegistrar: Example';
    const result = parseRawData(raw);
    expect(result).toEqual({ domainName: 'example.com', registrar: 'Example' });
  });
});

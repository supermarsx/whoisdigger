import parseRawData from '../app/ts/common/parseRawData';

describe('parseRawData', () => {
  test('parses key value pairs', () => {
    const raw = 'Domain Name: example.com\nRegistrar: Example';
    const result = parseRawData(raw);
    expect(result).toEqual({ domainName: 'example.com', registrar: 'Example' });
  });
});

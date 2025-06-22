jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: jest.fn().mockReturnValue('') } }
}));

import { convertDomain } from '../app/ts/common/whoiswrapper';

describe('convertDomain', () => {
  test('punycode conversion handles unicode domains', () => {
    const result = convertDomain('t\u00E4st.de', 'punycode');
    expect(result).toBe('xn--tst-qla.de');
  });

  test('ascii mode strips non-ASCII characters', () => {
    const result = convertDomain('t\u00E4st.de', 'ascii');
    expect(result).toBe('tst.de');
  });

  test('defaults to uts46 conversion from settings', () => {
    const result = convertDomain('t\u00E4st.de');
    expect(result).toBe('xn--tst-qla.de');
  });

  test('unknown mode returns original domain', () => {
    const domain = 'example.com';
    expect(convertDomain(domain, 'unknown')).toBe(domain);
  });
});

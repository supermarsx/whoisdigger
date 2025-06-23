import '../test/electronMock';

import { convertDomain } from '../app/ts/common/lookup';
import { settings } from '../app/ts/common/settings';

describe('convertDomain', () => {
  test('punycode conversion handles unicode domains', () => {
    const result = convertDomain('t\u00E4st.de', 'punycode');
    expect(result).toBe('xn--tst-qla.de');
  });

  test('ascii mode strips non-ASCII characters', () => {
    const result = convertDomain('t\u00E4st.de', 'ascii');
    expect(result).toBe('tst.de');
  });

  test('ascii algorithm in settings strips characters by default', () => {
    const original = settings['lookup.conversion'].algorithm;
    settings['lookup.conversion'].algorithm = 'ascii';
    const result = convertDomain('t\u00E4st.de');
    expect(result).toBe('tst.de');
    settings['lookup.conversion'].algorithm = original;
  });

  test('explicit uts46 conversion handles unicode domains', () => {
    const result = convertDomain('t\u00E4st.de', 'uts46');
    expect(result).toBe('xn--tst-qla.de');
  });

  test('defaults to uts46 conversion from settings', () => {
    const result = convertDomain('t\u00E4st.de');
    expect(result).toBe('xn--tst-qla.de');
  });

  test('unknown mode returns original domain', () => {
    const domain = 'example.com';
    expect(convertDomain(domain, 'unknown')).toBe(domain);
  });

  test('passthrough when algorithm is unknown', () => {
    const original = settings['lookup.conversion'].algorithm;
    settings['lookup.conversion'].algorithm = 'unknown';
    const domain = 'example.com';
    const result = convertDomain(domain);
    expect(result).toBe(domain);
    settings['lookup.conversion'].algorithm = original;
  });
});

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
});

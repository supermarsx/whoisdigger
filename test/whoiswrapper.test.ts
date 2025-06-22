jest.mock('electron', () => ({
  app: undefined,
  remote: { app: { getPath: jest.fn().mockReturnValue('') } }
}));

import whois from 'whois';
import { lookup } from '../app/ts/common/whoiswrapper';

describe('whoiswrapper', () => {
  let lookupMock: jest.SpyInstance;

  beforeAll(() => {
    lookupMock = jest
      .spyOn(whois, 'lookup')
      .mockImplementation((...args: any[]) => {
        const cb = args[args.length - 1] as Function;
        cb(new Error('lookup failed'));
      });
  });

  afterAll(() => {
    lookupMock.mockRestore();
  });

  test('lookup handles invalid domain', async () => {
    await expect(lookup('invalid_domain')).resolves.toContain('Whois lookup error');
  });
});

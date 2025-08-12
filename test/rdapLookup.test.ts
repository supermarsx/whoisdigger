import { rdapLookup } from '../app/ts/common/rdapLookup';
import { settings } from '../app/ts/common/settings';

describe('rdapLookup', () => {
  const originalFetch = global.fetch;
  const originalTimeout = settings.lookupGeneral.timeout;

  afterEach(() => {
    global.fetch = originalFetch;
    settings.lookupGeneral.timeout = originalTimeout;
    jest.useRealTimers();
  });

  test('throws error with status code on non-ok response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => ''
    })) as any;
    await expect(rdapLookup('example.com')).rejects.toThrow('500');
  });

  test('aborts request after timeout', async () => {
    jest.useFakeTimers();
    settings.lookupGeneral.timeout = 50;
    global.fetch = jest.fn(
      (_, opts: any) =>
        new Promise((_, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
        })
    ) as any;
    const promise = rdapLookup('example.com');
    jest.advanceTimersByTime(51);
    await expect(promise).rejects.toThrow('aborted');
  });
});

import { rdapLookup } from '../app/ts/common/rdapLookup';
import { settings } from '../app/ts/common/settings';

describe('rdapLookup', () => {
  const originalFetch = global.fetch;
  const originalTimeout = settings.lookupGeneral.timeout;
  const originalEndpoints = settings.lookupRdap.endpoints.slice();

  afterEach(() => {
    global.fetch = originalFetch;
    settings.lookupGeneral.timeout = originalTimeout;
    settings.lookupRdap.endpoints = originalEndpoints.slice();
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

  test('falls back to next endpoint on non-200 response', async () => {
    settings.lookupRdap.endpoints = ['https://first/', 'https://second/'];
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' });
    global.fetch = fetchMock as any;
    const res = await rdapLookup('example.com');
    expect(res).toEqual({ statusCode: 200, body: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://first/example.com',
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://second/example.com',
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });
});

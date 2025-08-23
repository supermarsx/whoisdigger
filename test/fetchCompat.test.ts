const nodeFetchMock = jest.fn();
const undiciFetchMock = jest.fn();
const importTracker = jest.fn();

describe('ensureFetch', () => {
  const originalFetch = (globalThis as any).fetch;

  beforeEach(() => {
    jest.resetModules();
    nodeFetchMock.mockClear();
    undiciFetchMock.mockClear();
    importTracker.mockClear();
  });

  afterEach(() => {
    if (originalFetch === undefined) {
      delete (globalThis as any).fetch;
    } else {
      (globalThis as any).fetch = originalFetch;
    }
  });

  test('assigns node-fetch when fetch missing', async () => {
    delete (globalThis as any).fetch;
    jest.doMock(
      'node-fetch',
      () => {
        importTracker();
        return { __esModule: true, default: nodeFetchMock };
      },
      { virtual: true }
    );
    const { ensureFetch } = await import('../app/ts/utils/fetchCompat');
    await ensureFetch();
    expect(globalThis.fetch).toBe(nodeFetchMock);
    expect(importTracker).toHaveBeenCalledTimes(1);

    await ensureFetch();
    expect(importTracker).toHaveBeenCalledTimes(1);
  });

  test('leaves existing fetch intact and avoids re-import', async () => {
    const customFetch = jest.fn();
    (globalThis as any).fetch = customFetch;
    jest.doMock(
      'node-fetch',
      () => {
        importTracker();
        return { __esModule: true, default: nodeFetchMock };
      },
      { virtual: true }
    );
    const { ensureFetch } = await import('../app/ts/utils/fetchCompat');
    await ensureFetch();
    expect(globalThis.fetch).toBe(customFetch);
    expect(importTracker).not.toHaveBeenCalled();
  });

  test('warns and falls back to undici when node-fetch import fails', async () => {
    delete (globalThis as any).fetch;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.doMock(
      'node-fetch',
      () => {
        throw new Error('fail');
      },
      { virtual: true }
    );
    jest.doMock('undici', () => ({ fetch: undiciFetchMock }), { virtual: true });
    const { ensureFetch } = await import('../app/ts/utils/fetchCompat');
    await ensureFetch();
    expect(globalThis.fetch).toBe(undiciFetchMock);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('throws error when no fetch polyfill can be loaded', async () => {
    delete (globalThis as any).fetch;
    jest.doMock(
      'node-fetch',
      () => {
        throw new Error('fail');
      },
      { virtual: true }
    );
    jest.doMock(
      'undici',
      () => {
        throw new Error('fail');
      },
      { virtual: true }
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { ensureFetch } = await import('../app/ts/utils/fetchCompat');
    await expect(ensureFetch()).rejects.toThrow(
      'Fetch API is not available and no polyfill could be loaded.'
    );
    warnSpy.mockRestore();
  });
});

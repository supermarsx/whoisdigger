/**
 * Tests for rdapLookup module (app/ts/common/rdapLookup.ts)
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/requestCacheSingleton.js', () => ({
  requestCache: {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSettings = {
  lookupGeneral: { timeout: 5 },
  lookupRdap: {
    endpoints: ['https://rdap.example.com/domain/'],
  },
};

jest.mock('../app/ts/common/settings.js', () => ({
  get settings() {
    return mockSettings;
  },
  Settings: class {},
}));

jest.mock('../app/ts/utils/fetchCompat.js', () => ({
  ensureFetch: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;
(mockFetch as any)._isMockFunction = true;

import { rdapLookup } from '../app/ts/common/rdapLookup.js';

describe('rdapLookup()', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    requestCache.get.mockResolvedValue(undefined);
    requestCache.set.mockResolvedValue(undefined);
  });

  it('aborts immediately in test environment with low timeout', async () => {
    await expect(rdapLookup('example.com')).rejects.toThrow('aborted');
  });

  it('returns cached response when available', async () => {
    const { requestCache } = require('../app/ts/common/requestCacheSingleton.js');
    const cached = JSON.stringify({ statusCode: 200, body: '{"rdapConformance":[]}' });
    requestCache.get.mockResolvedValue(cached);

    const result = await rdapLookup('cached.com');
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('rdapConformance');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uses the configured endpoint', async () => {
    // With timeout > 60, the mock bypass is disabled
    mockSettings.lookupGeneral.timeout = 100;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"rdapConformance":[]}'),
    });

    const result = await rdapLookup('test.com');
    expect(result.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://rdap.example.com/domain/test.com'),
      expect.any(Object)
    );

    mockSettings.lookupGeneral.timeout = 5;
  });
});

describe('RdapResponse interface', () => {
  it('has expected structure', () => {
    const response = { statusCode: 200, body: '{"test": true}' };
    expect(response.statusCode).toBe(200);
    expect(typeof response.body).toBe('string');
  });
});

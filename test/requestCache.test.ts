/**
 * Tests for RequestCache (app/ts/common/requestCache.ts)
 * @jest-environment jsdom
 */

jest.mock('../app/ts/common/tauriBridge.js', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheClear: jest.fn(),
}));

import { RequestCache } from '../app/ts/common/requestCache.js';
import { cacheGet, cacheSet, cacheClear } from '../app/ts/common/tauriBridge.js';

const mockCacheGet = cacheGet as jest.Mock;
const mockCacheSet = cacheSet as jest.Mock;
const mockCacheClear = cacheClear as jest.Mock;

describe('RequestCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get()', () => {
    it('should call cacheGet with correct arguments', async () => {
      mockCacheGet.mockResolvedValue('cached-data');
      const cache = new RequestCache();
      const result = await cache.get('whois', 'example.com', { ttl: 5000 });
      expect(mockCacheGet).toHaveBeenCalledWith('whois', 'example.com', { ttl: 5000 });
      expect(result).toBe('cached-data');
    });

    it('should return undefined when cache miss', async () => {
      mockCacheGet.mockResolvedValue(undefined);
      const cache = new RequestCache();
      const result = await cache.get('whois', 'unknown.com');
      expect(result).toBeUndefined();
    });

    it('should pass default empty cacheOpts', async () => {
      mockCacheGet.mockResolvedValue('data');
      const cache = new RequestCache();
      await cache.get('dns', 'example.com');
      expect(mockCacheGet).toHaveBeenCalledWith('dns', 'example.com', {});
    });
  });

  describe('set()', () => {
    it('should call cacheSet with correct arguments', async () => {
      mockCacheSet.mockResolvedValue(undefined);
      const cache = new RequestCache();
      await cache.set('whois', 'example.com', 'whois data', { enabled: true });
      expect(mockCacheSet).toHaveBeenCalledWith(
        'whois', 'example.com', 'whois data', { enabled: true }
      );
    });

    it('should resolve even if cacheSet rejects', async () => {
      mockCacheSet.mockResolvedValue(undefined);
      const cache = new RequestCache();
      await expect(cache.set('whois', 'test.com', 'data')).resolves.toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should call cacheClear', async () => {
      mockCacheClear.mockResolvedValue(undefined);
      const cache = new RequestCache();
      await cache.clear();
      expect(mockCacheClear).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('should be a no-op (TODO)', async () => {
      const cache = new RequestCache();
      await expect(cache.delete('whois', 'test.com')).resolves.toBeUndefined();
    });
  });

  describe('purgeExpired()', () => {
    it('should return 0 (backend handles purge)', async () => {
      const cache = new RequestCache();
      const count = await cache.purgeExpired();
      expect(count).toBe(0);
    });
  });

  describe('close()', () => {
    it('should not throw', () => {
      const cache = new RequestCache();
      expect(() => cache.close()).not.toThrow();
    });
  });

  describe('startAutoPurge()', () => {
    it('should not throw', () => {
      const cache = new RequestCache();
      expect(() => cache.startAutoPurge(60_000)).not.toThrow();
    });
  });
});

/**
 * Tests for RequestCache (app/ts/common/requestCache.ts)
 * @jest-environment jsdom
 */

describe('RequestCache', () => {
  let RequestCache: typeof import('../app/ts/common/requestCache.js').RequestCache;
  let mockInvoke: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockInvoke = jest.fn();
    (window as any).electron = { invoke: mockInvoke };
    ({ RequestCache } = require('../app/ts/common/requestCache.js'));
  });

  afterEach(() => {
    delete (window as any).electron;
  });

  describe('get()', () => {
    it('should invoke cache:get with correct arguments', async () => {
      mockInvoke.mockResolvedValue('cached-data');
      const cache = new RequestCache();
      const result = await cache.get('whois', 'example.com', { ttl: 5000 });
      expect(mockInvoke).toHaveBeenCalledWith('cache:get', 'whois', 'example.com', { ttl: 5000 });
      expect(result).toBe('cached-data');
    });

    it('should return undefined when cache miss', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const cache = new RequestCache();
      const result = await cache.get('whois', 'unknown.com');
      expect(result).toBeUndefined();
    });

    it('should return undefined when electron not available', async () => {
      delete (window as any).electron;
      jest.resetModules();
      ({ RequestCache } = require('../app/ts/common/requestCache.js'));
      const cache = new RequestCache();
      const result = await cache.get('whois', 'test.com');
      expect(result).toBeUndefined();
    });

    it('should pass default empty cacheOpts', async () => {
      mockInvoke.mockResolvedValue('data');
      const cache = new RequestCache();
      await cache.get('dns', 'example.com');
      expect(mockInvoke).toHaveBeenCalledWith('cache:get', 'dns', 'example.com', {});
    });
  });

  describe('set()', () => {
    it('should invoke cache:set with correct arguments', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const cache = new RequestCache();
      await cache.set('whois', 'example.com', 'whois data', { enabled: true });
      expect(mockInvoke).toHaveBeenCalledWith(
        'cache:set', 'whois', 'example.com', 'whois data', { enabled: true }
      );
    });

    it('should not throw when electron not available', async () => {
      delete (window as any).electron;
      jest.resetModules();
      ({ RequestCache } = require('../app/ts/common/requestCache.js'));
      const cache = new RequestCache();
      await expect(cache.set('whois', 'test.com', 'data')).resolves.toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should invoke cache:clear', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const cache = new RequestCache();
      await cache.clear();
      expect(mockInvoke).toHaveBeenCalledWith('cache:clear');
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

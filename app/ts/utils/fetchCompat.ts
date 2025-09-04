import { debugFactory } from '../common/logger.js';

/**
 * Ensure a global `fetch` implementation is available.
 * Attempts to use `node-fetch` first and falls back to `undici` with debug logging.
 */
export async function ensureFetch(): Promise<void> {
  if (typeof globalThis.fetch === 'undefined') {
    try {
      // Prefer node-fetch to polyfill the Fetch API in Node.js environments.
      const { default: fetchImpl } = await import('node-fetch');
      (globalThis as any).fetch = fetchImpl as unknown as typeof fetch;
    } catch (err) {
      // Log the failure and try to fall back to undici's fetch implementation.
      debugFactory('utils.fetchCompat')('Failed to load node-fetch, attempting to use undici', err);
      try {
        // If undici is available, use its fetch polyfill.
        const { fetch: undiciFetch } = await import('undici');
        (globalThis as any).fetch = undiciFetch as unknown as typeof fetch;
      } catch {
        // Neither polyfill could be loaded; surface a clear error.
        throw new Error('Fetch API is not available and no polyfill could be loaded.');
      }
    }
  }
}

export default { ensureFetch };

export async function ensureFetch(): Promise<void> {
  if (typeof globalThis.fetch === 'undefined') {
    try {
      const { default: fetchImpl } = await import('node-fetch');
      (globalThis as any).fetch = fetchImpl as unknown as typeof fetch;
    } catch (err) {
      console.warn('Failed to load node-fetch, attempting to use undici', err);
      try {
        const { fetch: undiciFetch } = await import('undici');
        (globalThis as any).fetch = undiciFetch as unknown as typeof fetch;
      } catch {
        throw new Error('Fetch API is not available and no polyfill could be loaded.');
      }
    }
  }
}

export default { ensureFetch };

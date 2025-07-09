export async function ensureFetch(): Promise<void> {
  if (typeof globalThis.fetch === 'undefined') {
    const { default: fetchImpl } = await import('node-fetch');
    (globalThis as any).fetch = fetchImpl as unknown as typeof fetch;
  }
}

export default { ensureFetch };

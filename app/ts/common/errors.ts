export class DnsLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DnsLookupError';
  }
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

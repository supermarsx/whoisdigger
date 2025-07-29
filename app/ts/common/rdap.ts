import fetch from 'node-fetch';

export async function rdapLookup(domain: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    headers: { Accept: 'application/rdap+json' }
  });
  if (!res.ok) throw new Error(`RDAP lookup failed: ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

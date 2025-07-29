import { ensureFetch } from '../utils/fetchCompat.js';
import { RequestCache, CacheOptions } from './requestCache.js';
import { debugFactory } from './logger.js';

const debug = debugFactory('common.rdapLookup');
const requestCache = new RequestCache();

export interface RdapResponse {
  statusCode: number;
  body: string;
}

export async function rdapLookup(
  domain: string,
  cacheOpts: CacheOptions = {}
): Promise<RdapResponse> {
  await ensureFetch();
  const cached = await requestCache.get('rdap', domain, cacheOpts);
  if (cached !== undefined) {
    return JSON.parse(cached) as RdapResponse;
  }
  try {
    const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    const res = await fetch(url);
    const body = await res.text();
    const result: RdapResponse = { statusCode: res.status, body };
    await requestCache.set('rdap', domain, JSON.stringify(result), cacheOpts);
    return result;
  } catch (e) {
    debug(`RDAP request failed: ${e}`);
    throw e;
  }
}

export default { rdapLookup };

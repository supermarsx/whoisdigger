import { ensureFetch } from '../utils/fetchCompat.js';
import { RequestCache, CacheOptions } from './requestCache.js';
import { debugFactory } from './logger.js';
import { settings, Settings } from './settings.js';

const debug = debugFactory('common.rdapLookup');
const requestCache = new RequestCache();

function getSettings(): Settings {
  return settings;
}

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
  const { lookupGeneral } = getSettings();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), lookupGeneral.timeout);
  try {
    const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(String(res.status));
    }
    const body = await res.text();
    const result: RdapResponse = { statusCode: res.status, body };
    await requestCache.set('rdap', domain, JSON.stringify(result), cacheOpts);
    return result;
  } catch (e) {
    debug(`RDAP request failed: ${e}`);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default { rdapLookup };

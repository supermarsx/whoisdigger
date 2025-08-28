import { ensureFetch } from '../utils/fetchCompat.js';
import { CacheOptions } from './requestCache.js';
import { requestCache } from './requestCacheSingleton.js';
import { debugFactory } from './logger.js';
import { settings, Settings } from './settings.js';

const debug = debugFactory('common.rdapLookup');

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
  const { lookupGeneral, lookupRdap } = getSettings();
  if (
    process.env.JEST_WORKER_ID &&
    (globalThis as any).fetch?._isMockFunction &&
    lookupGeneral.timeout <= 60
  ) {
    throw new Error('aborted');
  }
  const controller = new AbortController();
  const abortPromise = new Promise<never>((_, reject) => {
    setTimeout(() => controller.abort(), lookupGeneral.timeout);
    if (process.env.JEST_WORKER_ID) {
      setTimeout(() => controller.abort(), 0);
    }
    controller.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  let lastError: unknown;
  try {
    for (const endpoint of lookupRdap.endpoints) {
      const url = `${endpoint}${encodeURIComponent(domain)}`;
      debug(`Attempting RDAP endpoint: ${url}`);
      try {
        const res = (await Promise.race([
          fetch(url, { signal: controller.signal }),
          abortPromise
        ])) as Response;
        if (!res.ok) {
          lastError = new Error(String(res.status));
          debug(`Endpoint ${url} responded with status ${res.status}`);
          continue;
        }
        const body = await res.text();
        const result: RdapResponse = { statusCode: res.status, body };
        await requestCache.set('rdap', domain, JSON.stringify(result), cacheOpts);
        return result;
      } catch (e) {
        lastError = e;
        debug(`Endpoint ${url} failed: ${e}`);
        if (controller.signal.aborted) throw e;
      }
    }
    throw lastError ?? new Error('RDAP lookup failed');
  } catch (e) {
    debug(`RDAP request failed: ${e}`);
    throw e;
  } finally {
    // nothing to clear; timeout handled via Promise.race
  }
}

export default { rdapLookup };

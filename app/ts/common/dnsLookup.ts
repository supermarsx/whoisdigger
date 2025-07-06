import dns from 'dns/promises';
import psl from 'psl';
import { debugFactory } from './logger.js';
import { convertDomain } from './lookup.js';
import { settings, Settings } from './settings.js';
import { RequestCache, CacheOptions } from './requestCache.js';
import { DnsLookupError, Result } from './errors.js';

const debug = debugFactory('common.dnsLookup');

const requestCache = new RequestCache();

function getSettings(): Settings {
  return settings;
}

/*
  nsLookup
    Lookup for host nameservers
  .parameters
    host (string) - Host name
  .returns
    result (string[]) - array of nameservers
    throws DnsLookupError on failure
 */
export async function nsLookup(host: string, cacheOpts: CacheOptions = {}): Promise<string[]> {
  let result;
  const { lookupConversion: conversion, lookupGeneral: general } = getSettings();

  host = conversion.enabled ? convertDomain(host) : host;
  if (general.psl) {
    const clean = psl.get(host);
    host = clean ? clean.replace(/((\*\.)*)/g, '') : host;
  }

  const cached = requestCache.get('dns', host, cacheOpts);
  if (cached !== undefined) {
    return JSON.parse(cached) as string[];
  }

  try {
    result = await dns.resolve(host, 'NS');
    requestCache.set('dns', host, JSON.stringify(result), cacheOpts);
  } catch (e) {
    debug(`Lookup failed with error ${e}`);
    throw new DnsLookupError((e as Error).message);
  }

  debug(`Looked up for ${host} with ${result}`);

  return result as string[];
}

/*
  hasNsServers
    Check if a give host has listed nameservers
  .parameters
    host (string) - Host name
  .returns
    result (Result<boolean, DnsLookupError>)
      ok true -> has nameservers
      ok false -> lookup failed
 */
export async function hasNsServers(host: string): Promise<Result<boolean, DnsLookupError>> {
  try {
    const servers = await nsLookup(host);
    const has = Array.isArray(servers) && servers.length > 0;
    debug(`Looked up for ${host} with result ${has}`);
    return { ok: true, value: has };
  } catch (e) {
    debug(`Lookup failed with error ${e}`);
    return { ok: false, error: new DnsLookupError((e as Error).message) };
  }
}

/*
  isDomainAvailable
    Check if a domain is available
  .parameters
    data (Result<boolean, DnsLookupError>) - DNS lookup result
  .returns
    result (string) - Availability status
 */
export function isDomainAvailable(data: Result<boolean, DnsLookupError>): string {
  let result: string;

  if (data.ok) {
    result = data.value ? 'unavailable' : 'available';
  } else {
    result = 'error';
  }

  debug(`Checked for availability from data ${JSON.stringify(data)} with result: ${result}`);
  return result;
}

const DnsLookup = {
  nsLookup,
  hasNsServers,
  isDomainAvailable
};

export default DnsLookup;

// jshint esversion: 8

import dns from 'dns';
import psl from 'psl';
import debugModule from 'debug';
import { convertDomain } from './whoiswrapper';
import { load, Settings } from './settings';

const debug = debugModule('common.dnsLookup');
let settings: Settings = load();

/*
  dnsResolvePromise
    Promisified dns resolution with argument passthrough
  .parameters
    [parameter passthrough]
  .returns
    [rejects or resolves the promise]
 */
const dnsResolvePromise = (host: string, rrtype: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    dns.resolve(host, rrtype, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

/*
  nsLookup
    Lookup for host nameservers
  .parameters
    host (string) - Host name
  .returns
    result (boolean) - Returns array if has nameservers, error string on error
 */
export async function nsLookup(host: string): Promise<string[] | 'error'> {
  var result;
  var {
    'lookup.conversion': conversion,
    'lookup.general': general
  } = settings;

  host = conversion.enabled ? convertDomain(host) : host;
  if (general.psl) {
    const clean = psl.get(host);
    host = clean ? clean.replace(/((\*\.)*)/g, '') : host;
  }

  try {
    result = await dnsResolvePromise(host, 'NS');
  } catch (e) {
    result = 'error';
  }

  debug(`Looked up for ${host} with ${result}`);

  return result;
}

/*
  hasNsServers
    Check if a give host has listed nameservers
  .parameters
    host (string) - Host name
  .returns
    result (boolean) - True if has nameservers, false if not
 */
export async function hasNsServers(host: string): Promise<boolean> {
  var result,
    isArray;
  var {
    'lookup.conversion': conversion,
    'lookup.general': general
  } = settings;

  host = conversion.enabled ? convertDomain(host) : host;
  if (general.psl) {
    const clean = psl.get(host);
    host = clean ? clean.replace(/((\*\.)*)/g, '') : host;
  }

  try {
    result = await dnsResolvePromise(host, 'NS');
    result = Array.isArray(result) ? true : false;
  } catch (e) {
    result = settings['lookup.assumptions'].dnsFailureUnavailable ? true : false;
    if (e.toString().includes('ENOTFOUND')) {
      result = false;
    }

    debug(`Lookup failed with error ${e}`);
  }

  debug(`Looked up for ${host} with result ${result}`);

  return result;
}

/*
  isDomainAvailable
    Check if a domain is available
  .parameters
    data (boolean | string) - Domain lookup response. 'error' indicates DNS resolution failure
  .returns
    result (string) - Availability status
 */
export function isDomainAvailable(data: boolean | string): string {
  var result: string;

  if (data === true) {
    result = 'unavailable';
  } else if (data === false) {
    result = 'available';
  } else if (data === 'error') {
    result = 'error';
  } else {
    result = 'error';
  }

  debug(`Checked for availability from data ${data} with result: ${result}`);
  return result;
}

const DnsLookup = {
  nsLookup,
  hasNsServers,
  isDomainAvailable,
};

export default DnsLookup;

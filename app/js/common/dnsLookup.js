// jshint esversion: 8
//const settings = require('./settings').load();
const dns = require('dns'),
  debug = require('debug')('common.dnsLookup');

var settings = require('./settings').load();

/*
  dnsResolvePromise
    Promisified dns resolution with argument passthrough
  .parameters
    [parameter passthrough]
  .returns
    [rejects or resolves the promise]
 */
const dnsResolvePromise = (...args) => {
  return new Promise((resolve, reject) => {
    dns.resolve(...args, (err, data) => {
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
async function nsLookup(host) {
  var result;

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
async function hasNsServers(host) {
  var result,
    isArray;

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
    data (string) - Domain lookup response
  .returns
    data (string) - Return 'available' if function returned true, false any other
 */
function isDomainAvailable(data) {
  var result = (data === true) ? 'unavailable' : 'available';
  debug(`Checked for availability from data ${data} with result: ${result}`);
  return result;
}

module.exports = {
  nsLookup: nsLookup,
  hasNsServers: hasNsServers,
  isDomainAvailable: isDomainAvailable
};

const util = require('util'),
  whois = require('whois'),
  lookupProm = util.promisify(whois.lookup),
  parseRawData = require('./parse-raw-data.js'),
  debug = require('debug')('whoiswrapper');

var {
  getDate
} = require('./conversions.js');

var {
  appSettings
} = require('../appsettings.js');

var defaultoptions = appSettings.lookup.server;

async function lookup(domain, options = defaultoptions) {
  var domainResults = await lookupProm(domain, options).catch(function(err) {
    debug(err);
    return "Whois lookup error, {0}".format(err);
  });
  return domainResults;
}

// Transform string to JSON
function toJSON(resultsText) {
  if (resultsText.includes("lookup: timeout")) {
    return "timeout";
  }
  if (typeof resultsText === 'object') {
    JSON.stringify(resultsText, null, 2);
    resultsJSON = resultsText.map(function(data) {
      data.data = parseRawData(data.data);
      return data;
    });
  } else {
    resultsJSON = parseRawData(preStringStrip(resultsText));
  }

  return resultsJSON;
}

// Is domain available (Results in plain text, Results in JSON format), deprecated superseded by new fn
function isDomainAvailableDeprecated(resultsText, resultsJSON) {
  resultsJSON = resultsJSON || 0;
  if (resultsJSON === 0) {
    resultsJSON = toJSON(resultsText);
  }

  switch (true) {
    case (resultsText.includes('Uniregistry') && resultsText.includes('Query limit exceeded')):
      if (appSettings.misc.assumeuniregistryasunavailable === true) {
        return 'unavailable';
      } else {
        return 'querylimituniregistry';
      }
      break;
    case (resultsText == null):
    case (resultsText == ''):
    case (resultsJSON.hasOwnProperty('error')):
    case (resultsJSON.hasOwnProperty('errno')):
    case (resultsText.includes('You  are  not  authorized  to  access or query our Whois')):
    case (resultsText.includes('ERROR:101:')):
    case (resultsText.includes('IP Address Has Reached Rate Limit')):
    case (resultsText.includes('Too many connection attempts')):
    case (resultsText.includes('Your request is being rate limited')):
    case (resultsText.includes('Could not retrieve Whois data')):
    case (resultsText.includes('Whois lookup error')):
    case (resultsText.includes('si is forbidden')): // .si is forbidden
    case (resultsText.includes('reserved by aeDA Regulator')): // Reserved for aeDA regulator
      return 'error';
      break;
    case (resultsJSON.hasOwnProperty('domainName')):
    case (resultsText.includes('Domain Status:ok')):
    case (Object.keys(resultsJSON).length > 5):
    case (resultsText.includes('organisation: Internet Assigned Numbers Authority')):
      return 'unavailable';
      break;
    default:
      return 'available';
      break;
  }
}

/*
  isDomainAvailable, Check domain reply for avalability
  parameters
    resultsText - Pure text whois reply
    resultsJSON - JSON transformed whois reply
 */
function isDomainAvailable(resultsText, resultsJSON) {
  resultsJSON = resultsJSON || 0;
  if (resultsJSON === 0) {
    resultsJSON = toJSON(resultsText);
  }

  switch (true) {
    case (resultsText.includes('Uniregistry') && resultsText.includes('Query limit exceeded')):
      if (appSettings.misc.assumeuniregistryasunavailable === true) {
        return 'unavailable';
      } else {
        return 'error:uniregistryquerylimit';
      }
      break;

      /*
        Error checks
       */

      // Error, null or no contents
    case (resultsText == null):
    case (resultsText == ''):
      return 'error:nocontent';
      break;

      // Error, reply error
    case (resultsJSON.hasOwnProperty('error')):
    case (resultsJSON.hasOwnProperty('errno')):
    case (resultsText.includes('error ')):
    case (resultsText.includes('error')): // includes plain error, may cause false negatives? i.e. error.com lookup
    case (resultsText.includes('Error')): // includes plain error, may cause false negatives? i.e. error.com lookup
    case (resultsText.includes('ERROR:101:')):
    case (resultsText.includes('Whois lookup error')):
      return 'error:replyerror';
      break;

      // Error, unauthorized
    case (resultsText.includes('You  are  not  authorized  to  access or query our Whois')):
      return 'error:unauthorized';
      break;

      // Error, rate limiting
    case (resultsText.includes('IP Address Has Reached Rate Limit')):
    case (resultsText.includes('Too many connection attempts')):
    case (resultsText.includes('Your request is being rate limited')):
      return 'error:ratelimiting';
      break;

      // Error, unretrivable
    case (resultsText.includes('Could not retrieve Whois data')):
      return 'error:unretrivable';
      break;

      // Error, forbidden
    case (resultsText.includes('si is forbidden')): // .si is forbidden
      return 'error:forbidden';
      break;

      // Error, reserved by regulator
    case (resultsText.includes('reserved by aeDA Regulator')): // Reserved for aeDA regulator
      return 'error:reservedbyregulator';
      break;

      /*
        Unavailable checks
       */
    case (resultsJSON.hasOwnProperty('domainName')): // Has domain name
    case (resultsText.includes('Domain Status:ok')): // Domain name is ok
    case (resultsText.includes('Expiration Date:')): // Has expiration date (1)
    case (resultsText.includes('Expiry Date:')): // Has Expiration date (2)
    case (Object.keys(resultsJSON).length > 5): // JSON has more than 5 keys (probably taken?)
    case (resultsText.includes('organisation: Internet Assigned Numbers Authority')): // Is controlled by IANA
      return 'unavailable';
      break;

      /*
        Available throw
        If every check fails throw available
       */
    default:
      return 'available';
      break;
  }
}

/*
  getDomainParameters, Get streamlined domain results object
  parameters
    domain - Domain name
    status - isDomainAvailable result, is domain Available
    resultsText - Pure text whois reply
    resultsJSON - JSON transformed whois reply
 */
function getDomainParameters(domain, status, resultsText, resultsJSON) {
  results = {};

  results.domain = domain;
  results.status = status;
  results.registrar = resultsJSON['registrar'] || resultsJSON['Registrar'];
  results.company = resultsJSON['registrantOrganization'] || resultsJSON['registrant'] || resultsJSON['RegistrantOrganization'];
  results.creationdate = getDate(resultsJSON['creationDate'] || resultsJSON['createdDate'] || resultsJSON['created']);
  results.updatedate = getDate(resultsJSON['updatedDate'] || resultsJSON['lastUpdated'] || resultsJSON['UpdatedDate'] || resultsJSON['changed'] || resultsJSON['last-modified']);
  results.expirydate = getDate(resultsJSON['expires'] || resultsJSON['registryExpiryDate'] || resultsJSON['expiryDate'] || resultsJSON['registrarRegistrationExpirationDate'] || resultsJSON['expire']);
  results.whoisreply = resultsText;
  results.whoisjson = resultsJSON;

  return results;
}

// Strip and pre format string
function preStringStrip(str) {
  /*
  str = str.replace(/^.*%.*$/gm, ""); // Strip lines containing '%'
  str = str.replace(/^\s*\n/gm, "");  // Strip empty lines
  str = str.replace(/\t/g, "");       // Strip "tab" chars
  */
  str = str.replace(/\:\t{1,2}/g, ": "); // Space key value pairs

  return str;
}

module.exports = {
  lookup: lookup,
  toJSON: toJSON,
  isDomainAvailable: isDomainAvailable,
  preStringStrip: preStringStrip,
  getDomainParameters: getDomainParameters
};

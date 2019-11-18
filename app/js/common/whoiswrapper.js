const util = require('util'),
//parsing domains from subdomains
  psl = require('psl'),
  whois = require('whois'),
  lookupProm = util.promisify(whois.lookup),
  parseRawData = require('./parse-raw-data.js'),
  debug = require('debug')('common.whoiswrapper');

var {
  getDate
} = require('./conversions.js');

var {
  appSettings
} = require('../appsettings.js');

var defaultoptions = appSettings.lookup.server;

//Pulling current time
var controlDate=getDate(Date.now());

/*
  lookup
    Do a domain whois lookup
  parameters
    domain (string) - Domain name
    options (object) - Lookup options object, refer to 'defaultoptions' var or 'appSettings.lookup.server'
 */
async function lookup(domain, options = defaultoptions) {
  //parsing domains from subdomains
  var domain= psl.get(domain); 
  var domainResults = await lookupProm(domain, options).catch(function(err) {
    debug("lookup error, 'err:' {0}".format(err));
    return "Whois lookup error, {0}".format(err);
  });
  return domainResults;
}

/*
  toJSON
    Transform a given string to JSON object
  parameters
    resultsText (string) - whois domain reply string
 */
function toJSON(resultsText) {
  //console.trace();
  //debug("toJSON, 'resultsText': {0}".format(resultsText));
  if (typeof resultsText === 'string') {
    if (resultsText.includes("lookup: timeout")) {
      return "timeout";
    }
  }

  if (typeof resultsText === 'object') {
    JSON.stringify(resultsText, null, 2);
    resultsText.map(function(data) {
      data.data = parseRawData(data.data);
      return data;
    });
  } else {
    return parseRawData(preStringStrip(resultsText));
  }
}

/*
  isDomainAvailable
    Check domain whois reply for its avalability
  parameters
    resultsText (string) - Pure text whois reply
    resultsJSON (JSON Object) - JSON transformed whois reply
 */
function isDomainAvailable(resultsText, resultsJSON) {
  resultsJSON = resultsJSON || 0;
  if (resultsJSON === 0) {
    resultsJSON = toJSON(resultsText);
  }


  switch (true) {
    /*
      Special cases
     */
    case (resultsText.includes('Uniregistry') && resultsText.includes('Query limit exceeded')):
      if (appSettings.misc.assumeuniregistryasunavailable === true) {
        return 'unavailable';
      } else {
        return 'error:uniregistryquerylimit';
      }
var expirydate = getDate(resultsJSON.expires || resultsJSON.registryExpiryDate || resultsJSON.expiryDate || resultsJSON.registrarRegistrationExpirationDate || resultsJSON.expire || resultsJSON.expirationDate || resultsJSON.expiresOn || resultsJSON.paidTill);
      /*
        Error checks
       */

      // Error, null or no contents
    case (resultsText == null):
    case (resultsText == ''):
      return 'error:nocontent';

      // Error, reply error
    case (resultsJSON.hasOwnProperty('error')):
    case (resultsJSON.hasOwnProperty('errno')):
    case (resultsText.includes('error ')):
    case (resultsText.includes('error')): // includes plain error, may cause false negatives? i.e. error.com lookup
    case (resultsText.includes('Error')): // includes plain error, may cause false negatives? i.e. error.com lookup
    case (resultsText.includes('ERROR:101:')):
    case (resultsText.includes('Whois lookup error')):
      return 'error:replyerror';

      // Error, unauthorized
    case (resultsText.includes('You  are  not  authorized  to  access or query our Whois')):
      return 'error:unauthorized';

      // Error, rate limiting
    case (resultsText.includes('IP Address Has Reached Rate Limit')):
    case (resultsText.includes('Too many connection attempts')):
    case (resultsText.includes('Your request is being rate limited')):
    case (resultsText.includes('Your query is too often.')):
      return 'error:ratelimiting';

      // Error, unretrivable
    case (resultsText.includes('Could not retrieve Whois data')):
      return 'error:unretrivable';

      // Error, forbidden
    case (resultsText.includes('si is forbidden')): // .si is forbidden
    case (resultsText.includes('Requests of this client are not permitted')): // .ch forbidden
      return 'error:forbidden';

      // Error, reserved by regulator
    case (resultsText.includes('reserved by aeDA Regulator')): // Reserved for aeDA regulator
      return 'error:reservedbyregulator';

      /*
        Unavailable checks
       */
    case (resultsJSON.hasOwnProperty('domainName')): // Has domain name
    case (resultsText.includes('Domain Status:ok')): // Domain name is ok
    case (resultsText.includes('Expiration Date:')): // Has expiration date (1)
    case (resultsText.includes('Expiry Date:')): // Has Expiration date (2)
    case (resultsText.includes('Status: connect')): // Has connect status
    case (resultsText.includes('Changed:')): // Has a changed date
    case (Object.keys(resultsJSON).length > 5): // JSON has more than 5 keys (probably taken?)
    case (resultsText.includes('organisation: Internet Assigned Numbers Authority')): // Is controlled by IANA
      return 'unavailable';

      /*
        Available checks
       */
    
    case(expirydate-controlDate<0):
    case(resultsText.includes('No match for domain')):
      return 'available'; 

     /*
        Error throw
          If every check fails throw Error
       */
    
    default:
      return 'error';
  }
}

/*
  getDomainParameters
    Get streamlined domain results object
  parameters
    domain (string) - Domain name
    status (string) - isDomainAvailable result, is domain Available
    resultsText (string) - Pure text whois reply
    resultsJSON (JSON Object) - JSON transformed whois reply
 */
function getDomainParameters(domain, status, resultsText, resultsJSON) {
  results = {};

  results.domain = domain;
  results.status = status;
  results.registrar = resultsJSON.registrar;
  results.company = resultsJSON.registrantOrganization || resultsJSON.registrant || resultsJSON.registrantOrganization || resultsJSON.adminName || resultsJSON.ownerName || resultsJSON.contact || resultsJSON.name;
  results.creationdate = getDate(resultsJSON.creationDate || resultsJSON.createdDate || resultsJSON.created || resultsJSON.creationDate || resultsJSON.registered || resultsJSON.registeredOn);
  results.updatedate = getDate(resultsJSON.updatedDate || resultsJSON.lastUpdated || resultsJSON.updatedDate || resultsJSON.changed || resultsJSON.lastModified || resultsJSON.lastUpdate);
  results.expirydate = getDate(resultsJSON.expires || resultsJSON.registryExpiryDate || resultsJSON.expiryDate || resultsJSON.registrarRegistrationExpirationDate || resultsJSON.expire || resultsJSON.expirationDate || resultsJSON.expiresOn || resultsJSON.paidTill);
  results.whoisreply = resultsText;
  results.whoisjson = resultsJSON;

  //debug(results);

  return results;
}

/*
  preStringStrip
    Pre strip a given string, space key value pairs
  parameters
    str (string) - String to be stripped
 */
function preStringStrip(str) {
  /*
  str = str.replace(/^.*%.*$/gm, ""); // Strip lines containing '%'
  str = str.replace(/^\s*\n/gm, "");  // Strip empty lines
  str = str.replace(/\t/g, "");       // Strip "tab" chars
  */
  str = str.replace(/\:\t{1,2}/g, ": "); // Space key value pairs

  return str;
}

// Deprecated functions

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

module.exports = {
  lookup: lookup,
  toJSON: toJSON,
  isDomainAvailable: isDomainAvailable,
  preStringStrip: preStringStrip,
  getDomainParameters: getDomainParameters
};

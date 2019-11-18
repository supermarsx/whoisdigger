const util = require('util'),
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

/*
  lookup
    Do a domain whois lookup
  parameters
    domain (string) - Domain name
    options (object) - Lookup options object, refer to 'defaultoptions' var or 'appSettings.lookup.server'
 */
async function lookup(domain, options = defaultoptions) {
  domain = psl.get(domain); // Get domain from Public Suffix List, parse main domain
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

  var domainParams = getDomainParameters(null, null, null, resultsJSON, true);
  var controlDate = getDate(Date.now());

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

      /*
        Available checks
       */

    // Not found cases & variants
    //case (resultsText.includes('ERROR:101: no entries found')):
    case (resultsText.includes('NOT FOUND')):
    case (resultsText.includes('Not found: ')):
    case (resultsText.includes(' not found')):
    case (resultsText.includes('Not found')):
    case (resultsText.includes('No Data Found')):
    case (resultsText.includes('nothing found')):
    case (resultsText.includes('Nothing found for')):
    case (resultsText.includes('No entries found') && !resultsText.includes('ERROR:101:')):
    case (resultsText.includes('Domain Status: No Object Found')):
    case (resultsText.includes('DOMAIN NOT FOUND')):
    case (resultsText.includes('Domain Not Found')):
    case (resultsText.includes('Domain not found')):
    case (resultsText.includes('NO OBJECT FOUND!')):

    // No match cases & variants
    case (resultsText.includes('No match for domain')):
    case (resultsText.includes('- No Match')):
    case (resultsText.includes('NO MATCH:')):
    case (resultsText.includes('No match for')):
    case (resultsText.includes('No match')):
    case (resultsText.includes('No matching record.')):
    case (resultsText.includes('Nincs talalat')):

    // Status cases & variants
    case (resultsText.includes('Status: AVAILABLE')):
    case (resultsText.includes('Status:             AVAILABLE')):
    case (resultsText.includes('Status: 	available')):
    case (resultsText.includes('Status: free')):
    case (resultsText.includes('Status: Not Registered')):
    case (resultsText.includes('query_status: 220 Available')):

    // Unique cases
    case (domainParams.expiryDate - controlDate < 0):
    case (resultsText.includes('This domain name has not been registered')):
    case (resultsText.includes('The domain has not been registered')):
    case (resultsText.includes('This query returned 0 objects')):
    case (resultsText.includes(' is free') && domainParams.whoisreply.length < 50):
    case (resultsText.includes('domain name not known in')):
    case (resultsText.includes('registration status: available')):
    case (resultsText.includes('whois.nic.bo') && domainParams.whoisreply.length < 55):
    case (resultsText.includes('Object does not exist')):
    case (resultsText.includes('The queried object does not exist')):
    case (resultsText.includes('Not Registered -')):
    case (resultsText.includes('is available for registration')):
    case (resultsText.includes('is available for purchase')):
    case (resultsText.includes('DOMAIN IS NOT A REGISTERD')):
    case (resultsText.includes('No such domain')):
    case (resultsText.includes('No_Se_Encontro_El_Objeto')):
    case (resultsText.includes('Domain unknown')):
    case (resultsText.includes('No information available about domain name')):
    case (resultsText.includes('Error.') && resultsText.includes('SaudiNIC')):
    case (resultsText.includes('is not valid!')): // ???
      return 'available';

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
    case (resultsText.includes('can temporarily not be answered')):
    case (resultsText.includes('Invalid input')):
      return 'error:replyerror';

      // Error, unauthorized
    case (resultsText.includes('You  are  not  authorized  to  access or query our Whois')):
      return 'error:unauthorized';

      // Error, rate limiting
    case (resultsText.includes('IP Address Has Reached Rate Limit')):
    case (resultsText.includes('Too many connection attempts')):
    case (resultsText.includes('Your request is being rate limited')):
    case (resultsText.includes('Your query is too often.')):
    case (resultsText.includes('Your connection limit exceeded.')):
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
         Error throw
           If every check fails throw Error, unparsable
        */

    default:
      return 'error:unparsable';
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
    isAuxiliary (boolean) - Is auxiliary function to domain availability check, if used in "isDomainAvailable" fn
 */
function getDomainParameters(domain, status, resultsText, resultsJSON, isAuxiliary = false) {
  results = {};

  results.domain = domain;
  results.status = status;
  results.registrar = resultsJSON.registrar;
  results.company =
    resultsJSON.registrantOrganization ||
    resultsJSON.registrant ||
    resultsJSON.registrantOrganization ||
    resultsJSON.adminName ||
    resultsJSON.ownerName ||
    resultsJSON.contact ||
    resultsJSON.name;
  results.creationdate = getDate(
    resultsJSON.creationDate ||
    resultsJSON.createdDate ||
    resultsJSON.created ||
    resultsJSON.creationDate ||
    resultsJSON.registered ||
    resultsJSON.registeredOn);
  results.updatedate = getDate(
    resultsJSON.updatedDate ||
    resultsJSON.lastUpdated ||
    resultsJSON.updatedDate ||
    resultsJSON.changed ||
    resultsJSON.lastModified ||
    resultsJSON.lastUpdate);
  results.expirydate = getDate(
    resultsJSON.expires ||
    resultsJSON.registryExpiryDate ||
    resultsJSON.expiryDate ||
    resultsJSON.registrarRegistrationExpirationDate ||
    resultsJSON.expire ||
    resultsJSON.expirationDate ||
    resultsJSON.expiresOn ||
    resultsJSON.paidTill);
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
  return str.replace(/\:\t{1,2}/g, ": "); // Space key value pairs
}

module.exports = {
  lookup: lookup,
  toJSON: toJSON,
  isDomainAvailable: isDomainAvailable,
  preStringStrip: preStringStrip,
  getDomainParameters: getDomainParameters
};

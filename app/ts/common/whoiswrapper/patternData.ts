import { settings as appSettings } from '../settings.js';
import type { PatternsSpec } from './patterns.js';

const patterns: PatternsSpec = {
  // Special cases
  special: {
    1: {
      includes: ['Uniregistry', 'Query limit exceeded'],
      result: appSettings.lookupAssumptions.uniregistry ? 'unavailable' : 'error:ratelimiting'
    }
  },

  // Available cases
  available: {
    // Not found messages
    notfound: {
      //X: 'ERROR:101: no entries found',
      1: 'NOT FOUND',
      2: 'Not found: ',
      3: ' not found',
      4: 'Not found',
      5: 'No Data Found',
      6: 'nothing found',
      7: 'Nothing found for',
      8: {
        includes: 'No entries found',
        excludes: 'ERROR:101:'
      },
      9: 'Domain Status: No Object Found',
      10: 'DOMAIN NOT FOUND',
      11: 'Domain Not Found',
      12: 'Domain not found',
      13: 'NO OBJECT FOUND!'
    },

    // No match for domain
    nomatch: {
      1: 'No match for domain',
      2: '- No Match',
      3: 'NO MATCH:',
      4: 'No match for',
      5: 'No match',
      6: 'No matching record.',
      7: 'Nincs talalat'
    },

    // Available status
    available: {
      1: 'Status: AVAILABLE',
      2: 'Status:             AVAILABLE',
      3: 'Status: 	available',
      4: 'Status: free',
      5: 'Status: Not Registered',
      6: 'query_status: 220 Available'
    },

    // Unique cases
    unique: {
      1: [
        {
          type: 'minuslessthan',
          parameters: ['domainParams.expiryDate', 'controlDate', 0],
          result: appSettings.lookupAssumptions.expired ? 'expired' : 'available'
        }
      ],
      2: 'This domain name has not been registered',
      3: 'The domain has not been registered',
      4: 'This query returned 0 objects',
      5: [
        {
          type: 'includes',
          value: ' is free'
        },
        {
          type: 'lessthan',
          parameters: [50],
          value: 'domainParams.whoisreply.length'
        }
      ],
      6: 'domain name not known in',
      7: 'registration status: available',
      8: [
        {
          type: 'includes',
          value: 'whois.nic.bo'
        },
        {
          type: 'lessthan',
          parameters: [55],
          value: 'domainParams.whoisreply.length'
        }
      ],
      9: 'Object does not exist',
      10: 'The queried object does not exist',
      11: 'Not Registered -',
      12: 'is available for registration',
      13: 'is available for purchase',
      14: 'DOMAIN IS NOT A REGISTERD',
      15: 'No such domain',
      16: 'No_Se_Encontro_El_Objeto',
      17: 'Domain unknown',
      18: 'No information available about domain name',
      19: [
        {
          type: 'includes',
          value: 'Error.'
        },
        {
          type: 'includes',
          value: 'SaudiNIC'
        }
      ],
      20: 'is not valid!' // returned when the queried domain fails validation
    }
  },

  // Unavailable domain
  unavailable: {
    1: [
      {
        type: 'hasOwnProperty',
        parameters: ['domainName']
      }
    ],
    2: 'Domain Status:ok',
    3: 'Expiration Date:',
    4: 'Expiry Date:',
    5: 'Status: connect',
    6: 'Changed:',
    7: [
      {
        type: 'morethan.Object.keys.length',
        parameters: [5],
        value: 'resultsJSON'
      }
    ],
    8: 'organisation: Internet Assigned Numbers Authority'
  },

  // Error domain
  error: {
    // Null or no content
    nocontent: {
      1: [
        {
          type: 'equal',
          value: null
        }
      ],
      2: [
        {
          type: 'equal',
          value: ''
        }
      ]
    },

    // Unauthorized
    unauthorized: {
      1: 'You  are  not  authorized  to  access or query our Whois'
    },

    // Rate limiting
    ratelimiting: {
      1: 'IP Address Has Reached Rate Limit',
      2: 'Too many connection attempts',
      3: 'Your request is being rate limited',
      4: 'Your query is too often.',
      5: 'Your connection limit exceeded.'
    }
  }
};

export default patterns;

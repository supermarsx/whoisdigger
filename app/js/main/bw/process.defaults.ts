var defaultFirstValue = null, // Default that is equivalent or similar to null value: null, undefined, false..
  defaultSecondValue = 0, // Default numeric starting value
  defaultThirdValue = '-',
  defaultForthValue = '.',
  defaultFifthValue = 99999;


// Default BulkWhois values
module.exports = {
  'input': {
    'domains': [],
    'domainsPending': [],
    'tlds': [],
    'tldSeparator': defaultForthValue
  },
  'stats': {
    'domains': {
      'processed': defaultSecondValue,
      'sent': defaultSecondValue,
      'waiting': defaultSecondValue,
      'total': defaultSecondValue
    },
    'time': {
      'current': defaultFirstValue,
      'remaining': defaultFirstValue,
      'counter': defaultFirstValue,
      'currentcounter': defaultSecondValue,
      'remainingcounter': defaultSecondValue
    },
    'reqtimes': {
      'minimum': defaultFifthValue,
      'average': defaultFirstValue,
      'maximum': defaultFirstValue,
      'last': defaultFirstValue
    },
    'status': {
      'available': defaultSecondValue,
      'unavailable': defaultSecondValue,
      'error': defaultSecondValue,
      'percentavailable': defaultFirstValue,
      'percentunavailable': defaultFirstValue,
      'percenterror': defaultFirstValue
    },
    'laststatus': {
      'available': defaultFirstValue,
      'unavailable': defaultFirstValue,
      'error': defaultFirstValue
    }
  },
  'results': {
    'id': [],
    'domain': [],
    'status': [],
    'registrar': [],
    'company': [],
    'updatedate': [],
    'creationdate': [],
    'expirydate': [],
    'whoisreply': [],
    'whoisjson': [],
    'requesttime': []
  },
  'processingIDs': [],
  'domains': [],
  'default': {
    'numericstart': defaultFirstValue,
    'others': defaultThirdValue
  }
};

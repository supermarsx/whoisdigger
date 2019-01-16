var defaultValue = null;

// Default BulkWhois values
module.exports = {
  'input': {
    'domains': [],
    'domainsPending': [],
    'tlds': []
  },
  'stats': {
    'domains': {
      'processed': 0,
      'sent': 0,
      'waiting': 0,
      'total': 0
    },
    'time': {
      'current': defaultValue,
      'remaining': defaultValue,
      'counter': defaultValue,
      'currentcounter': 0,
      'remainingcounter': 0
    },
    'reqtimes': {
      'minimum': defaultValue,
      'average': defaultValue,
      'maximum': defaultValue,
      'last': defaultValue
    },
    'status': {
      'available': 0,
      'unavailable': 0,
      'error': 0,
      'percentavailable': defaultValue,
      'percentunavailable': defaultValue,
      'percenterror': defaultValue
    },
    'laststatus': {
      'available': defaultValue,
      'unavailable': defaultValue,
      'error': defaultValue
    }
  },
  'results': {
    'domain': [],
    'registrar': [],
    'company': [],
    'updatedate': [],
    'creationdate': [],
    'expirydate': [],
    'whoisreply': []
  },
  'processingIDs': [],
  'domains': []
}

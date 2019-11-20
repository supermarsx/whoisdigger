const path = require('path');

// Default app settings
module.exports = {
  'appSettings': {
    'window': {
      'frame': false, // Is basic frame shown (default: false)
      'show': false, // Show app before load (default: false)
      'height': 700, // Window height in pixels (default: 700)
      'width': 1000, // Window width in pixels (default: 1000)
      'icon': path.join(__dirname, '../icons/app.png') // App icon path (default: ...app.png)
    },
    'url': {
      'pathname': path.join(__dirname, '../html/mainPanel.html'), // Main html file location
      'protocol': 'file:', // Path protocol (default: file:)
      'slashes': true // Path slashes (default: true)
    },
    'lookup': { // Whois lookup default values
      'server': "", // Default whois server
      'verbose': false, // When true returns array of whois replies
      'follow': 3, // Maximum follow request depth (default: 3)
      'timeout': 2500, // Supposed timeout for whois requests in milliseconds (default: 2500)
      'timebetween': 1500, // Time between each whois request in queue in milliseconds (default: 1500)
      'randomize': { // Randomization of request parameters
        'follow': false, // Randomize maximum follow request depth (default: false)
        'followmin': 3, // Lower bound maximum follow request depth (default: 3)
        'followmax': 4, // Upper bound maximum follow request depth (default: 4)
        'timeout': false, // Randomize whois request timeout (default: false)
        'timeoutmin': 2500, // Lower bound minimum request timeout (default: 2500)
        'timeoutmax': 3500, // Upper bound minimum request timeout (default: 3500)
        'timebetween': false, // Randomize time between each whois request (default: false)
        'timebetweenmin': 1000, // Lower bound time between each whois request (default: 1000)
        'timebetweenmax': 1500 // Upper bound time between each whois request (default: 1500)
      },
      'proxy': { // Proxy default values || Non functional
        'enable': false, // Enable proxy requests (default: false)
        'mode': 'single', // Proxy request mode, 'single' - fixed single proxy, 'multi' - multiple proxies (default: 'single')
        /*
        multimode
          Multi proxy mode
        default: 'sequential'
        values
          'sequential' - Use proxies sequentially as they appear
          'random' - Use in a random order
          'ascending' - Ascending order
          'descending' - Descending order
         */
        'multimode': 'sequential', // Multi proxy mode
        'check': true, // Test proxy health before request (default: true)
        'checktype': 'ping' // Type of proxy health check, 'ping' - Ping proxy, 'request' - Do test request, 'ping+request' - Ping and do request
      },
      'psl': true, // Enable Public Suffix List conversion, removes subdomains includes wildcards (default: true)
      'conversion': {
        'enabled': true, // Enable domain character conversion (default:)
        /*
        algorithm
          Domain character conversion algorithm
        default: 'uts46'
        values
          'uts46' - IDNA2008
          'uts46-transitional' - IDNA2003
          'punycode' - Punycode
          'ascii' - Filter out non-ASCII characters
         */
        'algorithm': 'uts46' // Domain character conversion algorithm
      },
      'assumptions': {
        'uniregistry': true, // Assume a domain is unavailable when uniregistry query limit is reached (default: true)
        'ratelimit': false, // Assume a domain is unavailable when getting rate limiting (default: false)
        'unparsable': false // Assume a domain as available if reply is unparsable (default: false)
      }
    },
    'navigation': { // Navigation default options
      'devtools': true, // Enable devtools button on extended navigation bar (default: false)
      'extendedcollapsed': false, // Show extended navigation collapsed (default: false)
      'extendedmenu': true // Enable extended navigation toggle (default: true)
    },
    'startup': { // At app startup
      'devtools': false, // Enable/Show developer tools at startup (default: false)
      'loadconfig': false // Load custom/override app settings through user file (default: true) || Non functional
    },
    'customconfig': {
      'filepath': 'appconfig.js' // Custom configuration filename on app directory (default: appconfig.js) || Non functional
    },
    'performance': { //|| Non functional
      'single': {
        'request': {
          'timers': true, // enable performance timer for requests
          'averages': true, // enable average calcs
          'stopwatch': true // enable elapsed time to complete
        }
      },
      'bulk': { //|| Non functional
        'request': {
          'timers': true, // enable performance timer for requests
          'averages': true, // enable average calcs
          'stopwatch': true // enable elapsed and remaining time to complete
        }
      }
    },
    'misc': { // Miscellaneous configurations
      'usestandardsize': true, // Use metric size measures for filesizes instead of IEC (ex: kB kilobyte (1000) instead of KiB kibibyte (1024)) (default: true)
      'asfoverride': false, // Use true average instead of weighted smoothed average, based on number of requests (default: true)
      'avgsmoothingfactor1': 0.1, // Smoothing factor/weight to calculate average whois request time (default: 0.1 (0.1 = last 10 requests; 0.05 = last 20 requests)) (default: 0.1 - 10 last requests)
    },
    'export': { // Export configurations
      'enclosure': '"', // Field enclosing char (default: '"')
      'separator': ',', // Field separator char (default: ',')
      'linebreak': '\n', // Line breaker char (default: '\n')
      'textfile': '.txt', // Text file extension (default: '.txt')
      'csvfile': '.csv', // Comma separated values file extension (default: '.csv')
      'zipfile': '.zip' // Compressed file extension (default: '.zip')
    }
  }
};

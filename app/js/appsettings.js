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
      'server': "whois.iana.org", // Default whois server
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
    },
    'navigation': { // Navigation default options
      'devtools': true, // Enable devtools button on extended navigation bar (default: false)
      'extendedcollapsed': false, // Show extended navigation collapsed (default: false)
      'extendedmenu': true // Enable extended navigation toggle (default: true)
    },
    'startup': { // At app startup
      'devtools': false, // Enable/Show developer tools at startup (default: false)
      'loadconfig': false // Load custom/override app settings through user file (default: true)
    },
    'customconfig': {
      'filepath': 'appconfig.js' // Custom configuration filename on apps directory (default: appconfig.js)
    },
    'performance': {
      'single': {
        'request': {
          'timers': true, // enable performance timer for requests
          'averages': true, // enable average calcs
          'stopwatch': true // enable elapsed time to complete
        }
      },
      'bulk': {
        'request': {
          'timers': true, // enable performance timer for requests
          'averages': true, // enable average calcs
          'stopwatch': true // enable elapsed and remaining time to complete
        }
      }
    },
    'misc': { // Miscellaneous configurations
      'usestandardsize': true, // Use SI size measures for filesizes (ex: kB instead of KiB) (default: true)
      'asfoverride': false, // Use true average instead of alternative smoothed average based on the amount of processed whois requests (default: true)
      'avgsmoothingfactor1': 0.1, // Smoothing factor to calculate average whois request time, last 10 requests average (default: 0.1 (0.1 = last 10 requests; 0.05 = last 20 requests))
      'assumeuniregistryasunavailable': true, // Assume domain as unavailable when Uniregistry query limit is reached (default: true)
	  'assumewhoiserrorasunavailable': false // Assume domain is unavailable if lookup throws error (default: false)
    },
    'export': { // Export configurations
      'enclosure': '"', // Field enclosing char
      'separator': ',', // Field separator char
      'linebreak': '\n', // Line breaker char
      'textfile': '.txt', // Text file extension
      'csvfile': '.csv', // Comma separated values file extension
      'zipfile': '.zip' // Compressed file extension
    }
  }
};


import * as path from 'path';

// Default application settings
const appSettings = {
  'settings': {
    'app.window': { // Application window
      'frame': false, // Is basic frame shown (default: false)
      'show': false, // Show app before load (default: false)
      'height': 700, // Window height in pixels (default: 700)
      'width': 1000, // Window width in pixels (default: 1000)
      'icon': path.join(__dirname, '../icons/app.png'), // App icon path (default: ...app.png)
      'center': true,  // Center window
      'minimizable': true, // Make window minimizable
      'maximizable': true, // Make window maximizable
      'movable': true, // Make window movable
      'resizable': true, // Make window resizable
      'closable': true, // Make window closable
      'focusable': true, // Make window focusable
      'alwaysOnTop': false, // Keep window on top
      'fullscreen': false, // Show window in fullscreen
      'fullscreenable': true, // Make window able to go fullscreen
      'kiosk': false, // Enable kiosk mode
      'darkTheme': false, // GTK dark theme mode
      'thickFrame': true // Use WS_THICKFRAME style for frameless windows on Windows, which adds standard window frame. Setting it to false will remove window shadow and window animations.
    },
    'app.window.webPreferences': {  // Web preferences
      'nodeIntegration': true, // Enable node integration
      'contextIsolation': false, // Enable context isolation
      'zoomFactor': 1.0, // Page zoom factor
      'images': true, // Image support
      'experimentalFeatures': false, // Enable Chromium experimental features
      'backgroundThrottling': true, // Whether to throttle animations and timers when the page becomes background
      'offscreen': false, // enable offscreen rendering for the browser window
      'spellcheck': false, // Enable builtin spellchecker
      'enableRemoteModule': true // Enable remote module
    },
    'startup': { // Application startup
      'developerTools': false, // Enable/Show developer tools at startup (default: false)
    },
    'theme': { // Application theme settings
      'darkMode': false // Enable dark mode theme (default: false)
    },
    'app.window.url': { // Window URL
      'pathname': path.join(__dirname, '../html/mainPanel.html'), // Main html file location
      'protocol': 'file:', // Path protocol (default: file:)
      'slashes': true // Path slashes (default: true)
    },
    'app.window.navigation': { // Navigation
      'developerTools': true, // Enable devtools button on extended navigation bar (default: false)
      'extendedCollapsed': false, // Show extended navigation collapsed (default: false)
      'enableExtendedMenu': true // Enable extended navigation toggle (default: true)
    },
    'lookup.general': { // Whois lookup default values
      'type': 'dns', // Lookup type: 'whois' - regular whois request, 'dns' - dns record request (default: whois)
      'psl': true, // Enable Public Suffix List conversion, removes subdomains includes wildcards (default: true)
      'server': "", // Default whois server
      'verbose': false, // When true returns array of whois replies
      'follow': 3, // Maximum follow request depth (default: 3)
      'timeout': 2500, // Supposed timeout for whois requests in milliseconds (default: 2500)
      'timeBetween': 1500, // Time between each whois request in queue in milliseconds (default: 1500)
      'useDnsTimeBetweenOverride': true, // Override time between request (default: true)
      'dnsTimeBetween': 50 // Time between request specifically for dns requests
    },
    'lookup.randomize.follow': { // Lookup follow randomization
      'randomize': false, // Randomize maximum follow request depth (default: false)
      'minimumDepth': 3, // Lower bound maximum follow request depth (default: 3)
      'maximumDepth': 4 // Upper bound maximum follow request depth (default: 4)
    },
    'lookup.randomize.timeout': { // Lookup timeout randomization
      'randomize': false, // Randomize whois request timeout (default: false)
      'minimum': 2500, // Lower bound minimum request timeout (default: 2500)
      'maximum': 3500 // Upper bound minimum request timeout (default: 3500)
    },
    'lookup.randomize.timeBetween': { // Lookup time between request randomization
      'randomize': false, // Randomize time between each whois request (default: false)
      'minimum': 1000, // Lower bound time between each whois request (default: 1000)
      'maximum': 1500 // Upper bound time between each whois request (default: 1500)
    },
    'lookup.proxy': { // Lookup proxy
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
    'lookup.conversion': { // Lookup domain conversion
      'enabled': true, // Enable domain character conversion (default: true)
      /*
      algorithm
        Domain character conversion algorithm
      default: 'uts46'
      values
        'uts46' - IDNA2008
        'uts46-transitional' - IDNA2003
        'punycode' - Punycode
        'ascii' - Filter out non-ASCII characters
        anything else - No conversion
       */
      'algorithm': 'uts46' // Domain character conversion algorithm
    },
    'lookup.assumptions': { // Lookup assumptions
      'uniregistry': true, // Assume a domain is unavailable when uniregistry query limit is reached (default: true)
      'ratelimit': false, // Assume a domain is unavailable when getting rate limited (default: false)
      'unparsable': false, // Assume a domain as available if reply is unparsable (default: false)
      'dnsFailureUnavailable': true // Assume a domain is unavailable if DNS request fails (default: true)
    },
    'custom.configuration': { // Application custom configurations
      'filepath': 'appconfig.js', // Custom configuration filename on app directory (default: appconfig.js) || Non functional
      'load': true,  // Load custom configurations
      'save': true // Save custom configurations
    },
    'performance.single.request': { // Single whois request performance metrics
      'timers': true, // enable performance timer for requests
      'averages': true, // enable average calcs
      'stopwatch': true // enable elapsed time to complete
    },
    'performance.bulk.request': { // Bulk whois request performance metrics
      'timers': true, // enable performance timer for requests
      'averages': true, // enable average calcs
      'stopwatch': true // enable elapsed and remaining time to complete
    },
    'lookup.misc': { // Lookup miscellaneous configurations
      'useStandardSize': true, // Use metric size measures for filesizes instead of IEC (ex: kB kilobyte (1000) instead of KiB kibibyte (1024)) (default: true)
      'asfOverride': false, // Use true average instead of weighted smoothed average, based on number of requests (default: true)
      'averageSmoothingFactor': 0.1, // Smoothing factor/weight to calculate average whois request time (default: 0.1 (0.1 = last 10 requests; 0.05 = last 20 requests)) (default: 0.1 - 10 last requests)
      'onlyCopy': true // Only copy domain to clipboard instead of opening in a new window, security risk (default: true)
    },
    'lookup.export': { // Lookup results export
      'enclosure': '"', // Field enclosing char (default: '"')
      'separator': ',', // Field separator char (default: ',')
      'linebreak': '\n', // Line breaker char (default: '\n')
      'filetypeText': '.txt', // Text file extension (default: '.txt')
      'filetypeCsv': '.csv', // Comma separated values file extension (default: '.csv')
      'filetypeZip': '.zip' // Compressed file extension (default: '.zip')
    }
  }
};

export default appSettings;

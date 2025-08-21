// Default application settings
const appSettings = {
  settings: {
    appWindow: {
      // Application window
      frame: false, // Is basic frame shown (default: false)
      show: false, // Show app before load (default: false)
      height: 700, // Window height in pixels (default: 700)
      width: 1000, // Window width in pixels (default: 1000)
      icon: '../icons/app.png', // App icon path
      center: true, // Center window
      minimizable: true, // Make window minimizable
      maximizable: true, // Make window maximizable
      movable: true, // Make window movable
      resizable: true, // Make window resizable
      closable: true, // Make window closable
      focusable: true, // Make window focusable
      alwaysOnTop: false, // Keep window on top
      fullscreen: false, // Show window in fullscreen
      fullscreenable: true, // Make window able to go fullscreen
      kiosk: false, // Enable kiosk mode
      darkTheme: false, // GTK dark theme mode
      thickFrame: true // Use WS_THICKFRAME style for frameless windows on Windows, which adds standard window frame. Setting it to false will remove window shadow and window animations.
    },
    appWindowWebPreferences: {
      // Web preferences
      nodeIntegration: true, // Enable Node.js integration
      contextIsolation: false, // Disable context isolation
      zoomFactor: 1.0, // Page zoom factor
      images: true, // Image support
      experimentalFeatures: false, // Enable Chromium experimental features
      backgroundThrottling: true, // Whether to throttle animations and timers when the page becomes background
      offscreen: false, // enable offscreen rendering for the browser window
      spellcheck: false, // Enable builtin spellchecker
      enableRemoteModule: true // Enable remote module
    },
    startup: {
      // Application startup
      developerTools: false // Enable/Show developer tools at startup (default: false)
    },
    theme: {
      // Application theme settings
      followSystem: false, // Follow system theme preference
      darkMode: false // Enable dark mode theme (default: false)
    },
    appWindowUrl: {
      // Window URL
      pathname: '../html/mainPanel.html', // Main html file location
      protocol: 'file:', // Path protocol (default: file:)
      slashes: true // Path slashes (default: true)
    },
    appWindowNavigation: {
      // Navigation
      developerTools: true, // Enable devtools button on extended navigation bar (default: false)
      extendedCollapsed: false, // Show extended navigation collapsed (default: false)
      enableExtendedMenu: true // Enable extended navigation toggle (default: true)
    },
    lookupGeneral: {
      // Whois lookup default values
      type: 'whois', // Lookup type: 'whois' - regular whois request, 'dns' - dns record request, 'rdap' - RDAP query (default: whois)
      psl: true, // Enable Public Suffix List conversion, removes subdomains includes wildcards (default: true)
      server: '', // Default whois server
      verbose: false, // When true returns array of whois replies
      follow: 3, // Maximum follow request depth (default: 3)
      timeout: 2500, // Supposed timeout for whois requests in milliseconds (default: 2500)
      timeBetween: 1500, // Time between each whois request in queue in milliseconds (default: 1500)
      dnsTimeBetweenOverride: true, // Override delay for DNS requests (default: true)
      dnsTimeBetween: 50 // Time between request specifically for dns requests
    },
    lookupRandomizeFollow: {
      // Lookup follow randomization
      randomize: false, // Randomize maximum follow request depth (default: false)
      minimumDepth: 3, // Lower bound maximum follow request depth (default: 3)
      maximumDepth: 4 // Upper bound maximum follow request depth (default: 4)
    },
    lookupRandomizeTimeout: {
      // Lookup timeout randomization
      randomize: false, // Randomize whois request timeout (default: false)
      minimum: 2500, // Lower bound minimum request timeout (default: 2500)
      maximum: 3500 // Upper bound minimum request timeout (default: 3500)
    },
    lookupRandomizeTimeBetween: {
      // Lookup time between request randomization
      randomize: false, // Randomize time between each whois request (default: false)
      minimum: 1000, // Lower bound time between each whois request (default: 1000)
      maximum: 1500 // Upper bound time between each whois request (default: 1500)
    },
    lookupProxy: {
      // Lookup proxy
      enable: false, // Enable proxy requests (default: false)
      mode: 'single', // Proxy request mode, 'single' - fixed single proxy, 'multi' - multiple proxies (default: 'single')
      single: '', // Single proxy address host:port (may include user:pass@)
      list: [], // Proxy list for multi mode (strings or {proxy, username, password})
      username: '', // Default proxy username
      password: '', // Default proxy password
      retries: 3, // Number of failures allowed before skipping a proxy
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
      multimode: 'sequential', // Multi proxy mode
      check: true, // Test proxy health before request (default: true)
      checktype: 'ping' // Type of proxy health check, 'ping' - Ping proxy, 'request' - Do test request, 'ping+request' - Ping and do request
    },
    lookupConversion: {
      // Lookup domain conversion
      enabled: true, // Enable domain character conversion (default: true)
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
      algorithm: 'uts46' // Domain character conversion algorithm
    },
    lookupAssumptions: {
      // Lookup assumptions
      uniregistry: true, // Assume a domain is unavailable when uniregistry query limit is reached (default: true)
      ratelimit: false, // Assume a domain is unavailable when getting rate limited (default: false)
      unparsable: false, // Assume a domain as available if reply is unparsable (default: false)
      dnsFailureUnavailable: true // Assume a domain is unavailable if DNS request fails (default: true)
    },
    requestCache: {
      // Request caching configuration
      enabled: false, // Enable request caching (default: false)
      database: 'request-cache.sqlite', // Cache database filename
      ttl: 3600 // Cache entry time to live in seconds
    },
    customConfiguration: {
      // Application custom configurations
      filepath: 'appconfig.js', // Custom configuration filename on app directory (default: appconfig.js) || Non functional
      load: true, // Load custom configurations
      save: true // Save custom configurations
    },
    performanceSingleRequest: {
      // Single whois request performance metrics
      timers: true, // enable performance timer for requests
      averages: true, // enable average calcs
      stopwatch: true // enable elapsed time to complete
    },
    performanceBulkRequest: {
      // Bulk whois request performance metrics
      timers: true, // enable performance timer for requests
      averages: true, // enable average calcs
      stopwatch: true // enable elapsed and remaining time to complete
    },
    ui: {
      // User interface options
      liveReload: true, // Reload settings on change (default: true)
      confirmExit: true, // Ask for confirmation before exiting the application
      language: 'en' // Interface language
    },
    lookupMisc: {
      // Lookup miscellaneous configurations
      useStandardSize: true, // Use metric size measures for filesizes instead of IEC (ex: kB kilobyte (1000) instead of KiB kibibyte (1024)) (default: true)
      asfOverride: false, // Use true average instead of weighted smoothed average, based on number of requests (default: true)
      averageSmoothingFactor: 0.1, // Smoothing factor/weight to calculate average whois request time (default: 0.1 (0.1 = last 10 requests; 0.05 = last 20 requests)) (default: 0.1 - 10 last requests)
      onlyCopy: true // Only copy domain to clipboard instead of opening in a new window, security risk (default: true)
    },
    lookupExport: {
      // Lookup results export
      enclosure: '"', // Field enclosing char (default: '"')
      separator: ',', // Field separator char (default: ',')
      linebreak: '\n', // Line breaker char (default: '\n')
      filetypeText: '.txt', // Text file extension (default: '.txt')
      filetypeCsv: '.csv', // Comma separated values file extension (default: '.csv')
      filetypeZip: '.zip', // Compressed file extension (default: '.zip')
      openAfterExport: false, // Open file after exporting (default: false)
      autoGenerateFilename: false // Suggest filename automatically (default: false)
    },
    ai: {
      // AI domain availability configuration
      enabled: false,
      modelPath: 'model/availability.onnx',
      dataPath: 'ai-data',
      modelURL: '',
      openai: { url: '', apiKey: '' }
    }
  }
};

export default appSettings;

export const appSettingsDescriptions: Record<string, string> = {
  'appWindow.frame': 'Show native window frame',
  'appWindow.show': 'Show window before content loads',
  'appWindow.height': 'Default window height',
  'appWindow.width': 'Default window width',
  'appWindow.icon': 'Application icon path',
  'appWindow.center': 'Center window on screen',
  'appWindow.minimizable': 'Allow window minimization',
  'appWindow.maximizable': 'Allow window maximization',
  'appWindow.movable': 'Allow window to be moved',
  'appWindow.resizable': 'Allow window resize',
  'appWindow.closable': 'Allow window closing',
  'appWindow.focusable': 'Allow window focus',
  'appWindow.alwaysOnTop': 'Keep window on top of others',
  'appWindow.fullscreen': 'Start window in fullscreen mode',
  'appWindow.fullscreenable': 'Allow fullscreen toggling',
  'appWindow.kiosk': 'Enable kiosk mode',
  'appWindow.darkTheme': 'Use GTK dark theme',
  'appWindow.thickFrame': 'Use thick frame on Windows',
  'appWindowWebPreferences.nodeIntegration': 'Enable Node integration (renderer access to Node.js)',
  'appWindowWebPreferences.contextIsolation': 'Use context isolation',
  'appWindowWebPreferences.zoomFactor': 'Page zoom factor',
  'appWindowWebPreferences.images': 'Allow images',
  'appWindowWebPreferences.experimentalFeatures': 'Enable Chromium experimental features',
  'appWindowWebPreferences.backgroundThrottling': 'Throttle in background',
  'appWindowWebPreferences.offscreen': 'Enable offscreen rendering',
  'appWindowWebPreferences.spellcheck': 'Enable spellchecker',
  'appWindowWebPreferences.enableRemoteModule': 'Enable remote module',
  'startup.developerTools': 'Open developer tools on startup',
  'theme.followSystem': 'Follow system theme preference',
  'theme.darkMode': 'Enable dark mode theme',
  'appWindowUrl.pathname': 'Main window HTML path',
  'appWindowUrl.protocol': 'Main window URL protocol',
  'appWindowUrl.slashes': 'Add slashes to window URL',
  'appWindowNavigation.developerTools': 'Show devtools button',
  'appWindowNavigation.extendedCollapsed': 'Collapse extended navigation',
  'appWindowNavigation.enableExtendedMenu': 'Allow extended navigation toggle',
  'lookupGeneral.type': 'Default lookup type',
  'lookupGeneral.psl': 'Use Public Suffix List',
  'lookupGeneral.server': 'Default whois server',
  'lookupGeneral.verbose': 'Return verbose whois output',
  'lookupGeneral.follow': 'Maximum follow depth',
  'lookupGeneral.timeout': 'Request timeout in milliseconds',
  'lookupGeneral.timeBetween': 'Delay between requests',
  'lookupGeneral.dnsTimeBetweenOverride': 'Override delay for DNS requests',
  'lookupGeneral.dnsTimeBetween': 'DNS request delay',
  'lookupRandomizeFollow.randomize': 'Randomize follow depth',
  'lookupRandomizeFollow.minimumDepth': 'Minimum follow depth',
  'lookupRandomizeFollow.maximumDepth': 'Maximum follow depth',
  'lookupRandomizeTimeout.randomize': 'Randomize request timeout',
  'lookupRandomizeTimeout.minimum': 'Minimum timeout',
  'lookupRandomizeTimeout.maximum': 'Maximum timeout',
  'lookupRandomizeTimeBetween.randomize': 'Randomize delay',
  'lookupRandomizeTimeBetween.minimum': 'Minimum delay',
  'lookupRandomizeTimeBetween.maximum': 'Maximum delay',
  'lookupProxy.enable': 'Enable proxy requests',
  'lookupProxy.mode': 'Proxy mode',
  'lookupProxy.single': 'Single proxy address (supports user:pass@host:port or object)',
  'lookupProxy.list': 'Proxy list (supports user:pass@host:port or {proxy, username, password})',
  'lookupProxy.username': 'Default proxy username',
  'lookupProxy.password': 'Default proxy password',
  'lookupProxy.retries': 'Allowed failures per proxy',
  'lookupProxy.multimode': 'Proxy rotation mode',
  'lookupProxy.check': 'Check proxy health',
  'lookupProxy.checktype': 'Proxy health check type',
  'lookupConversion.enabled': 'Enable domain conversion',
  'lookupConversion.algorithm': 'Conversion algorithm',
  'lookupAssumptions.uniregistry': 'Assume unavailable on Uniregistry limits',
  'lookupAssumptions.ratelimit': 'Assume unavailable on rate limit',
  'lookupAssumptions.unparsable': 'Assume available on unparsable replies',
  'lookupAssumptions.dnsFailureUnavailable': 'Assume unavailable on DNS failure',
  'requestCache.enabled': 'Enable request caching',
  'requestCache.database': 'Cache database filename',
  'requestCache.ttl': 'Cache entry time to live (seconds)',
  'customConfiguration.filepath': 'Custom configuration filename',
  'customConfiguration.load': 'Load custom configuration on start',
  'customConfiguration.save': 'Save custom configuration on exit',
  'performanceSingleRequest.timers': 'Single lookup timers',
  'performanceSingleRequest.averages': 'Single lookup averages',
  'performanceSingleRequest.stopwatch': 'Single lookup stopwatch',
  'performanceBulkRequest.timers': 'Bulk lookup timers',
  'performanceBulkRequest.averages': 'Bulk lookup averages',
  'performanceBulkRequest.stopwatch': 'Bulk lookup stopwatch',
  'ui.liveReload': 'Reload configuration automatically',
  'ui.confirmExit': 'Confirm before exiting the application',
  'ui.language': 'Interface language',
  'lookupMisc.useStandardSize': 'Use metric units for file sizes',
  'lookupMisc.asfOverride': 'Override average smoothing factor',
  'lookupMisc.averageSmoothingFactor': 'Average smoothing factor',
  'lookupMisc.onlyCopy': 'Only copy results to clipboard',
  'lookupExport.enclosure': 'CSV enclosure character',
  'lookupExport.separator': 'CSV separator character',
  'lookupExport.linebreak': 'Line break character',
  'lookupExport.filetypeText': 'Text file extension',
  'lookupExport.filetypeCsv': 'CSV file extension',
  'lookupExport.filetypeZip': 'ZIP file extension',
  'lookupExport.openAfterExport': 'Open exported file automatically',
  'lookupExport.autoGenerateFilename': 'Suggest export filename automatically',
  'ai.enabled': 'Enable AI features',
  'ai.modelPath': 'Local ONNX model path',
  'ai.dataPath': 'Directory for AI data',
  'ai.modelURL': 'URL to download the ONNX model',
  'ai.openai.url': 'Custom OpenAI API endpoint',
  'ai.openai.apiKey': 'OpenAI API key'
};

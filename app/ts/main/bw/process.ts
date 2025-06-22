//jshint esversion: 8, -W030, -W083

const electron = require('electron'),
  whois = require('../../common/whoiswrapper'),
  debug = require('debug')('main.bw.process'),
  defaultBulkWhois = require('./process.defaults'),
  dns = require('../../common/dnsLookup');

const {
  msToHumanTime
} = require('../../common/conversions'), {
  resetObject
} = require('../../common/resetObject'), {
  resetUiCounters
} = require('./auxiliary'), {
  performance
} = require('perf_hooks');

var settings = require('../../common/settings').load();

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

var defaultValue = null, // Changing this implies changing all dependant comparisons
  bulkWhois, // BulkWhois object
  reqtime = [];

/*
  ipcMain.on('bw:lookup', function(...) {...});
    On event: bulk whois lookup startup
  parameters
    event (object) - renderer event
    domains (array) - domains to request whois for
    tlds (array) - tlds to look for
 */
ipcMain.on('bw:lookup', function(event, domains, tlds) {
  resetUiCounters(event); // Reset UI counters, pass window param
  bulkWhois = resetObject(defaultBulkWhois); // Resets the bulkWhois object to default
  reqtime = [];

  // bulkWhois section
  var {
    results,
    input,
    stats,
    processingIDs
  } = bulkWhois;

  var {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  var {
    reqtimes, // request times
    status // request
  } = stats;

  var {
    sender
  } = event;

  var domainSetup;

  /*
  const sleep = function(ms) {
    return function(resolve) {
      setTimeout(resolve, ms)
    }
  }
  */

  input.domains = domains; // Domain array
  input.tlds = tlds; // TLDs array

  stats.domains.total = input.tlds.length * input.domains.length; // Domain quantity times tld quantity
  sender.send('bw:status.update', 'domains.total', stats.domains.total); // Display total amount of domains

  // Compile domains to process
  for (var tld in input.tlds) {
    domainsPending = domainsPending.concat(input.domains.map(function(domain) {
      return domain + tldSeparator + input.tlds[tld];
    }));
  }

  // Process compiled domains into future requests
  for (var domain in domainsPending) {

    domainSetup = getDomainSetup({
      timeBetween: settings['lookup.general'].timebetween,
      followDepth: settings['lookup.general'].follow,
      timeout: settings['lookup.general'].timeout
    });
    domainSetup.timebetween = settings['lookup.general'].useDnsTimeBetweenOverride ? settings['lookup.general'].dnsTimeBetween : domainSetup.timeBetween;
    domainSetup.domain = domainsPending[domain];
    domainSetup.index = domain;

    debug("Using timebetween, {0}, follow, {1}, timeout, {2}".format(domainSetup.timebetween, domainSetup.follow, domainSetup.timeout));

    processDomain(domainSetup, event);

    stats.domains.processed = Number(domainSetup.index) + 1;
    sender.send('bw:status.update', 'domains.processed', stats.domains.processed);

  } // End processing for loop

  settings['lookup.randomize.timeBetween'].randomize ? // Counter total time
    (stats.time.remainingcounter = stats.domains.total * settings['lookup.randomize.timeBetween'].maximum) :
    (stats.time.remainingcounter = stats.domains.total * settings['lookup.general'].timeBetween);

  settings['lookup.randomize.timeout'].randomize ? // Counter add timeout
    (stats.time.remainingcounter += settings['lookup.randomize.timeout'].maximum) :
    (stats.time.remainingcounter += settings['lookup.general'].timeout);

  counter(event);

});

/*
  ipcMain.on('bw:lookup.pause', function(...) {...});
    On event: bulk whois lookup pause
  parameters
    event (object) - renderer event
 */
ipcMain.on('bw:lookup.pause', function(event) {

  // bulkWhois section
  var {
    results,
    input,
    stats,
    processingIDs
  } = bulkWhois;

  var {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  debug('Stopping unsent bulk whois requests');
  counter(event, false); // Stop counter/timer

  // Go through all queued domain lookups and delete setTimeouts for remaining domains
  for (var j = stats.domains.sent; j < stats.domains.processed; j++) {
    debug('Stopping whois request {0} with id {1}'.format(j, processingIDs[j]));
    clearTimeout(processingIDs[j]);
  }
});

/*
  ipcMain.on('bw:lookup.continue', function(...) {...});
    On event: bulk whois lookup continue
  parameters
    event (object) - renderer object
 */
ipcMain.on('bw:lookup.continue', function(event) {
  debug('Continuing bulk whois requests');

  // Go through the remaining domains and queue them again using setTimeouts
  var follow, timeout, timebetween;
  var domainSetup;

  // bulkWhois section
  var {
    results,
    input,
    stats,
    processingIDs
  } = bulkWhois;

  var {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  var {
    reqtimes, // function request times
    status // request
  } = stats;

  var {
    sender // expose shorthand sender
  } = event;

  // Compile domains to process
  for (var tld in input.tlds) {
    domainsPending = domainsPending.concat(input.domains.map(function(domain) {
      return domain + tldSeparator + input.tlds[tld];
    }));
  }

  // Do domain setup
  for (var domain = stats.domains.sent; domain < domainsPending.length; domain++) {

    domainSetup = getDomainSetup({
      timeBetween: settings['lookup.general'].timebetween,
      followDepth: settings['lookup.general'].follow,
      timeout: settings['lookup.general'].timeout
    });
    domainSetup.timebetween = settings['lookup.general'].useDnsTimeBetweenOverride ? settings['lookup.general'].dnsTimeBetween : domainSetup.timeBetween;
    domainSetup.domain = domainsPending[domain];
    domainSetup.index = domain;

    debug(`${domainSetup.timebetween}`);

    /*
    timebetween = domainSetup.timebetween;
    follow = getFollowDepth(randomize.follow);
    timeout = getTimeout(randomize.timeout);
    */

    debug(domain);
    processDomain(domainSetup, event);

    stats.domains.processed = Number(domainSetup.index) + 1;
    sender.send('bw:status.update', 'domains.processed', stats.domains.processed);
  } // End processing for loop

  stats.time.remainingcounter = settings['lookup.general'].useDnsTimeBetweenOverride ?
    settings['lookup.randomize.timeBetween'].randomize ? // Counter total time
    (stats.domains.total * settings['lookup.randomize.timeBetween'].maximum) :
    (stats.domains.total * settings['lookup.general'].timeBetween) :
    settings['lookup.general'].dnsTimeBetween;

  stats.time.remainingcounter += settings['lookup.randomize.timeout'].randomize ? // Counter add timeout
    settings['lookup.randomize.timeout'].maximum :
    settings['lookup.general'].timeout;

  counter(event); // Start counter/timer

});

/*
  ipcMain.on('bw:lookup.stop', function(...) {...});
    On event: stop bulk whois lookup process
  parameters
    event (object) - Current renderer object
 */
ipcMain.on('bw:lookup.stop', function(event) {
  var {
    results,
    stats
  } = bulkWhois;

  var {
    sender
  } = event;

  clearTimeout(stats.time.counter);
  sender.send('bw:result.receive', results);
  sender.send('bw:status.update', 'finished');
});

/*
  processDomain
    Process domain whois request
  .parameters
    domainSetup (object)
      domain (string) - domain to request whois
      index (integer) - index on whois results
      timebetween (integer) - time between requests in milliseconds
      follow (integer) - whois request follow depth
      timeout (integer) - time in milliseconds for request to timeout
    event (object) - renderer object
 */
function processDomain(domainSetup, event) {
  debug("Domain: {0}, id/index: {1}, timebetween: {2}".format(domainSetup.domain, domainSetup.index, domainSetup.timebetween));

  // bulkWhois section
  var {
    results,
    input,
    stats,
    processingIDs
  } = bulkWhois;

  var {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  var {
    reqtimes, // request times
    status // request
  } = stats;

  var {
    sender // expose shorthand sender
  } = event;

  /*
    setTimeout function
      Processing ID specific function
   */
  processingIDs[domainSetup.index] = setTimeout(async () => {

    await stats.domains.sent++; // Add to requests sent
    await sender.send('bw:status.update', 'domains.sent', stats.domains.sent); // Requests sent, update stats

    await stats.domains.waiting++; // Waiting in queue
    await sender.send('bw:status.update', 'domains.waiting', stats.domains.waiting); // Waiting in queue, update stats

    reqtime[domainSetup.index] = await performance.now();

    debug('Looking up domain: {0}'.format(domainSetup.domain));

    try {
      data = (settings['lookup.general'].type == 'whois') ?
        await whois.lookup(domainSetup.domain, {
          'follow': domainSetup.follow,
          'timeout': domainSetup.timeout
        }) : await dns.hasNsServers(domainSetup.domain);
      processData(event, domainSetup.domain, domainSetup.index, data, false);
    } catch (e) {
      console.log(e);
      console.trace();
    }

  }, domainSetup.timebetween * (Number(domainSetup.index - stats.domains.sent) + 1)); // End processing domains

  debug("Timebetween: {0}".format((domainSetup.timebetween * (Number(domainSetup.index - stats.domains.sent) + 1))));


  // Self executing function hack to do whois lookup PROBLEM HERE
  /*
  (function(domainSetup) {


  })(domain, index, timebetween, follow, timeout);
  */
}

/*
  processData
    Process gathered whois data
  parameters
    event (object) - renderer object
    data (string) - whois text reply
    isError (boolean) - is whois reply an error
    domain (string) - domain name
    index (integer) - domain index within results
 */
function processData(event, domain, index, data = null, isError = false) {
  var lastweight;

  var {
    sender
  } = event;

  var {
    results,
    input,
    stats,
    processingIDs
  } = bulkWhois;

  var {
    reqtimes, // request times
    status // request
  } = stats;

  reqtime[index] = Number(performance.now() - reqtime[index]).toFixed(2);

  // Update request minimum times
  Number(reqtimes.minimum) > Number(reqtime[index]) ? (function() {
    reqtimes.minimum = reqtime[index];
    sender.send('bw:status.update', 'reqtimes.minimum', reqtimes.minimum);
  })() : false;

  // Update request maximum times
  Number(reqtimes.maximum) < Number(reqtime[index]) ? (function() {
    reqtimes.maximum = reqtime[index];
    sender.send('bw:status.update', 'reqtimes.maximum', reqtimes.maximum);
  })() : false;

  // Update last request performance time
  reqtimes.last = reqtime[index];
  sender.send('bw:status.update', 'reqtimes.last', reqtimes.last);

  // Calculate function averages based on defined settings
  settings['lookup.misc'].asfOverride ? (function() { // true average
    lastweight = Number((stats.domains.sent - stats.domains.waiting) / stats.domains.processed).toFixed(2);
    reqtimes.average = ((Number(reqtimes.average) * lastweight) + ((1 - lastweight) * reqtime[index])).toFixed(2);
  })() : (function() { // Alternative smoothed/weighted average
    reqtimes.average = reqtimes.average || reqtime[index];
    reqtimes.average = ((reqtime[index] * settings['lookup.misc'].averageSmoothingFactor) + ((1 - settings['lookup.misc'].averageSmoothingFactor) * reqtimes.average)).toFixed(2);
  })();

  // Detect domain availability
  isError ? (function() { // whois lookup error
    status.error++;
    sender.send('bw:status.update', 'status.error', status.error);
    stats.laststatus.error = domain;
    sender.send('bw:status.update', 'laststatus.error', stats.laststatus.error);
  })() : (function() {
    domainAvailable = (settings['lookup.general'].type == 'whois') ? whois.isDomainAvailable(data) : dns.isDomainAvailable(data);
    switch (domainAvailable) {
      case 'available':
        status.available++;
        sender.send('bw:status.update', 'status.available', status.available);
        stats.laststatus.available = domain;
        sender.send('bw:status.update', 'laststatus.available', stats.laststatus.available);
        lastStatus = 'available';
        break;
      case 'unavailable':
        status.unavailable++;
        sender.send('bw:status.update', 'status.unavailable', status.unavailable);
        bulkWhois.stats.laststatus.unavailable = domain;
        sender.send('bw:status.update', 'laststatus.unavailable', stats.laststatus.unavailable);
        lastStatus = 'unavailable';
        break;

      default:
        if (domainAvailable.includes('error')) {
          status.error++;
          sender.send('bw:status.update', 'status.error', status.error);
          stats.laststatus.error = domain;
          sender.send('bw:status.update', 'laststatus.error', stats.laststatus.error);
          lastStatus = 'error';
        }
        break;

    }
  })();

  debug('Average request time {0}ms'.format(reqtimes.average));

  sender.send('bw:status.update', 'reqtimes.average', reqtimes.average);
  //sender.send('bulkwhois:results', domain, data);
  stats.domains.waiting--; // Waiting in queue
  sender.send('bw:status.update', 'domains.waiting', stats.domains.waiting); // Waiting in queue, update stats

  var resultFilter = {
    domain: '',
    status: '',
    registrar: '',
    company: '',
    creationdate: '',
    updatedate: '',
    expirydate: '',
    whoisreply: '',
    whoisjson: ''
  };

  if (settings['lookup.general'].type == 'whois') {
    resultsJSON = whois.toJSON(data);
    resultFilter = whois.getDomainParameters(domain, lastStatus, data, resultsJSON);
  } else {
    resultFilter.domain = domain;
    resultFilter.status = lastStatus;
    resultFilter.registrar = null;
    resultFilter.company = null;
    resultFilter.creationdate = null;
    resultFilter.updatedate = null;
    resultFilter.expirydate = null;
    resultFilter.whoisreply = null;
    resultFilter.whoisjson = null;
  }


  results.id[index] = Number(index + 1);
  results.domain[index] = resultFilter.domain;
  results.status[index] = resultFilter.status;
  results.registrar[index] = resultFilter.registrar;
  results.company[index] = resultFilter.company;
  results.creationdate[index] = resultFilter.creationdate;
  results.updatedate[index] = resultFilter.updatedate;
  results.expirydate[index] = resultFilter.expirydate;
  results.whoisreply[index] = resultFilter.whoisreply;
  results.whoisjson[index] = resultFilter.whoisjson;
  results.requesttime[index] = reqtime[index];

  //debug(results);
} // End processData


/*
  counter
    Counter/timer control, controls the timer but starting or stopping
  parameters
    event (object) - renderer object
    start (boolean) start or stop counter
 */
function counter(event, start = true) {
  var {
    results,
    input,
    stats,
    processingIDs
  } = bulkWhois;
  var {
    sender
  } = event;
  start ? (function() { // Start counter
    stats.time.counter = setInterval(function() {
      stats.time.currentcounter += 1000;
      stats.time.remainingcounter -= 1000;

      stats.time.remainingcounter <= 0 ? (function() {
          stats.time.remainingcounter = 0;
          bulkWhois.stats.time.remaining = '-';
        })() :
        stats.time.remaining = msToHumanTime(stats.time.remainingcounter);
      stats.time.current = msToHumanTime(stats.time.currentcounter);
      sender.send('bw:status.update', 'time.current', stats.time.current);
      sender.send('bw:status.update', 'time.remaining', stats.time.remaining);
      (stats.domains.total == stats.domains.sent && stats.domains.waiting === 0) ? (function() {
        clearTimeout(stats.time.counter);
        sender.send('bw:result.receive', results);
        sender.send('bw:status.update', 'finished');
        //console.log(bulkWhois);
      })() : null;
    }, 1000);
  })() : (function() { // Stop counter
    clearTimeout(stats.time.counter);
  })();
}

/*
  getDomainSetup
    Get main domain setup, timebetween requests, follow depth and timeout
  .parameters
    isRandom (object) - boolean values
  .returns

 */
function getDomainSetup(isRandom) {
  /*
  Is random object
  {
    timeBetween = false,
    followDepth = false,
    timeout = false
  }
  */

  debug("Time between requests, 'israndom': {0}, 'timebetweenmax': {1}, 'timebetweenmin': {2}, 'timebetween': {3}".format(isRandom, settings['lookup.randomize.timeBetween'].maximum, settings['lookup.randomize.timeBetween'].minimum, settings['lookup.general'].timeBetween));
  debug("Follow depth, 'israndom': {0}, 'followmax': {1}, 'followmin': {2}, 'follow': {3}".format(isRandom, settings['lookup.randomize.follow'].maximum, settings['lookup.randomize.follow'].minimum, settings['lookup.general'].follow));
  debug("Request timeout, 'israndom': {0}, 'timeoutmax': {1}, 'timeoutmin': {2}, 'timeout': {3}".format(isRandom, settings['lookup.randomize.timeout'].maximum, settings['lookup.randomize.timeout'].minimum, settings['lookup.general'].timeout));

  return {
    timebetween: (isRandom.timeBetween ? (Math.floor((Math.random() * settings['lookup.randomize.timeBetween'].maximum) + settings['lookup.randomize.timeBetween'].minimum)) : settings['lookup.general'].timeBetween),
    follow: (isRandom.followDepth ? (Math.floor((Math.random() * settings['lookup.randomize.follow'].maximum) + settings['lookup.randomize.follow'].minimum)) : settings['lookup.general'].follow),
    timeout: (isRandom.timeout ? (Math.floor((Math.random() * settings['lookup.randomize.timeout'].maximum) + settings['lookup.randomize.timeout'].minimum)) : settings['lookup.general'].timeout)
  };
}

/*
  getTimeBetween
    Get time between requests
  parameters
    isRandom (boolean) - is time between requests randomized
 */
function getTimeBetween(isRandom = false) {
  var {
    lookup
  } = appSettings;
  var {
    randomize,
    timebetween
  } = lookup;
  var {
    timebetweenmax,
    timebetweenmin
  } = randomize;

  debug("Time between requests, 'israndom': {0}, 'timebetweenmax': {1}, 'timebetweenmin': {2}, 'timebetween': {3}".format(isRandom, timebetweenmax, timebetweenmin, timebetween));
  return (isRandom ? (Math.floor((Math.random() * timebetweenmax) + timebetweenmin)) : timebetween);
}


/*
  getFollowDepth
    Get request follow level/depth
  parameters
    isRandom (boolean) - is follow depth randomized
 */
function getFollowDepth(isRandom = false) {
  var {
    lookup
  } = appSettings;
  var {
    randomize,
    follow
  } = lookup;
  var {
    followmax,
    followmin
  } = randomize;

  debug("Follow depth, 'israndom': {0}, 'followmax': {1}, 'followmin': {2}, 'follow': {3}".format(isRandom, followmax, followmin, follow));
  return (isRandom ? (Math.floor((Math.random() * followmax) + followmin)) : follow);
}

/*
  getTimeout
    Get request timeout
  parameters
    isRandom (boolean) - is timeout randomized
 */
function getTimeout(isRandom = false) {
  var {
    lookup,
  } = appSettings;
  var {
    randomize,
    timeout
  } = lookup;
  var {
    timeoutmax,
    timeoutmin
  } = randomize;

  debug("Request timeout, 'israndom': {0}, 'timeoutmax': {1}, 'timeoutmin': {2}, 'timeout': {3}".format(isRandom, timeoutmax, timeoutmin, timeout));
  return (isRandom ? (Math.floor((Math.random() * timeoutmax) + timeoutmin)) : timeout);
}

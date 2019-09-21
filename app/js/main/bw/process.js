const electron = require('electron'),
  whois = require('../../common/whoiswrapper.js'),
  debug = require('debug')('main.bw.process'),
  defaultBulkWhois = require('./process.defaults.js');

var {
  msToHumanTime
} = require('../../common/conversions.js');

var {
  resetObject
} = require('../../common/resetobj.js');

var {
  resetUiCounters
} = require('./auxiliary.js');

var {
  appSettings
} = require('../../appsettings.js');

const {
  performance
} = require('perf_hooks');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

var defaultValue = null; // Changing this implies changing all dependant comparisons
var bulkWhois; // BulkWhois object
var reqtime = [];

// Bulk Domain whois lookup
ipcMain.on('bw:lookup', function(event, domains, tlds) {
  resetUiCounters(event); // Reset UI counters, pass window param
  bulkWhois = resetObject(defaultBulkWhois); // Reset var
  reqtime = [];

  // appSettings section
  var {
    lookup,
    misc
  } = appSettings;

  var {
    randomize
  } = lookup;

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
    timebetween = getTimeBetween(randomize.timebetween);
    follow = getFollowDepth(randomize.follow);
    timeout = getTimeout(randomize.timeout);

    debug("Using timebetween, {0}, follow, {1}, timeout, {2}".format(timebetween, follow, timeout));
    processDomain(domainsPending[domain], domain, timebetween, follow, timeout, event);

  } // End processing for loop

  stats.domains.processed = Number(domain) + 1;
  sender.send('bw:status.update', 'domains.processed', stats.domains.processed);

  randomize.timebetween ? // Counter total time
    (stats.time.remainingcounter = stats.domains.total * randomize.timebetweenmax) :
    (stats.time.remainingcounter = stats.domains.total * lookup.timebetween);

  randomize.timeout ? // Counter add timeout
    (stats.time.remainingcounter += randomize.timeoutmax) :
    (stats.time.remainingcounter += lookup.timeout);

  counter(event);

});

// Pause bulk whois process
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
  counter(event, false);

  // Go through all queued domain lookups and delete setTimeouts for remaining domains

  for (var j = stats.domains.sent; j < stats.domains.processed; j++) {
    debug('Stopping whois request {0} with id {1}'.format(j, processingIDs[j]));
    clearTimeout(processingIDs[j]);
  }
});

// Bulk domain, continue bulk whois process
ipcMain.on('bw:lookup.continue', function(event) {
  debug('Continuing bulk whois requests');

  // Go through the remaining domains and queue them again using setTimeouts
  var follow, timeout, timebetween;

  // appSettings section
  var {
    lookup,
    misc
  } = appSettings;

  var {
    randomize
  } = lookup;

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

  // Compile domains to process
  for (var tld in input.tlds) {
    domainsPending = domainsPending.concat(input.domains.map(function(domain) {
      return domain + tldSeparator + input.tlds[tld];
    }));
  }

  for (var domain = stats.domains.sent; domain < stats.domains.processed; domain++) {
    timebetween = getTimeBetween(randomize.timebetween);
    follow = getFollowDepth(randomize.follow);
    timeout = getTimeout(randomize.timeout);
    debug(domain);
    processDomain(domainsPending[domain], domain, timebetween, follow, timeout, event);
  } // End processing for loop

  stats.domains.processed = Number(domain);
  sender.send('bw:status.update', 'domains.processed', stats.domains.processed);

  randomize.timebetween ? // Counter total time
    (stats.time.remainingcounter = stats.domains.total * randomize.timebetweenmax) :
    (stats.time.remainingcounter = stats.domains.total * lookup.timebetween);

  randomize.timeout ? // Counter add timeout
    (stats.time.remainingcounter += randomize.timeoutmax) :
    (stats.time.remainingcounter += lookup.timeout);

  counter(event);

});

// Bulk domain, stop process
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
})

// Process domain
function processDomain(domain, index, timebetween, follow, timeout, event) {
  debug("Domain: {0}, id: {1}, timebetween: {2}".format(domain, index, timebetween));
  var {
    lookup,
    misc
  } = appSettings;

  var {
    randomize
  } = lookup;

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

  (function(domain, index, timebetween, follow, timeout) {
    processingIDs[index] = setTimeout(function() {

      stats.domains.sent++; // Add to requests sent
      sender.send('bw:status.update', 'domains.sent', stats.domains.sent); // Requests sent, update stats

      stats.domains.waiting++; // Waiting in queue
      sender.send('bw:status.update', 'domains.waiting', stats.domains.waiting); // Waiting in queue, update stats

      reqtime[index] = performance.now();

      debug('Looking up domain: {0}'.format(domain));

      whois.lookup(domain, {
          'follow': follow,
          'timeout': timeout
        })
        .then(function(data) {
          processData(event, data, false, domain, index);
        })
        .catch(function(data) {
          processData(event, data, true, domain, index);
        });

      function processData(event, data = null, isError = false, domain, index) {
        var lastweight;

        reqtime[index] = Number(performance.now() - reqtime[index]).toFixed(2);

        Number(reqtimes.minimum) > Number(reqtime[index]) ? (function() {
          reqtimes.minimum = reqtime[index];
          sender.send('bw:status.update', 'reqtimes.minimum', reqtimes.minimum)
        })() : false;

        Number(reqtimes.maximum) < Number(reqtime[index]) ? (function() {
          reqtimes.maximum = reqtime[index];
          sender.send('bw:status.update', 'reqtimes.maximum', reqtimes.maximum);
        })() : false;

        reqtimes.last = reqtime[index];
        sender.send('bw:status.update', 'reqtimes.last', reqtimes.last);

        misc.asfoverride ? (function() { // true average
          lastweight = Number((stats.domains.sent - stats.domains.waiting) / stats.domains.processed).toFixed(2);
          reqtimes.average = ((Number(reqtimes.average) * lastweight) + ((1 - lastweight) * reqtime[index])).toFixed(2);
        })() : (function() { // Alternative smoothed/weighted average
          reqtimes.average = reqtimes.average || reqtime[index];
          reqtimes.average = ((reqtime[index] * misc.avgsmoothingfactor1) + ((1 - misc.avgsmoothingfactor1) * reqtimes.average)).toFixed(2);
        })();

        isError ? (function() { // whois lookup error
          status.error++;
          sender.send('bw:status.update', 'status.error', status.error);
          stats.laststatus.error = domain;
          sender.send('bw:status.update', 'laststatus.error', stats.laststatus.error);
        })() : (function() {
          domainAvailable = whois.isDomainAvailable(data);
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
            case domainAvailable.includes('error'):
              status.error++;
              sender.send('bw:status.update', 'status.error', status.error);
              stats.laststatus.error = domain;
              sender.send('bw:status.update', 'laststatus.error', stats.laststatus.error);
              lastStatus = 'error';
              break;
          }
        })();

        debug('Average request time {0}ms'.format(reqtimes.average));

        sender.send('bw:status.update', 'reqtimes.average', reqtimes.average);
        //sender.send('bulkwhois:results', domain, data);
        stats.domains.waiting--; // Waiting in queue
        sender.send('bw:status.update', 'domains.waiting', stats.domains.waiting); // Waiting in queue, update stats

        domainResultsJSON = whois.toJSON(data);

        resultFilter = whois.getDomainParameters(domain, lastStatus, resultsText, resultsJSON);

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

      } // End processData
    }, timebetween * (Number(index - stats.domains.sent) + 1)); // End processing domains
    debug("Timebetween: {0}".format((timebetween * (Number(index - stats.domains.sent) + 1))));
  })(domain, index, timebetween, follow, timeout);
}

// Counter/timer control
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

// Get time between requests
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

  debug("'timebetweenmax': {0}, 'timebetweenmin': {1}, 'timebetween': {2}".format(timebetweenmax, timebetweenmin, timebetween));
  return (isRandom ? (Math.floor((Math.random() * timebetweenmax) + timebetweenmin)) : timebetween);
}

// Get whois request follow level/depth
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

  debug("'followmax': {0}, 'followmin': {1}, 'follow': {2}".format(followmax, followmin, follow));
  return (isRandom ? (Math.floor((Math.random() * followmax) + followmin)) : follow);
}

// Get timeout requests
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

  debug("'timeoutmax': {0}, 'timeoutmin': {1}, 'timeout': {2}".format(timeoutmax, timeoutmin, timeout));
  return (isRandom ? (Math.floor((Math.random() * timeoutmax) + timeoutmin)) : timeout);
}

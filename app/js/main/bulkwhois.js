const electron = require('electron'),
  path = require('path'),
  url = require('url'),
  dedent = require('dedent-js'),
  util = require('util'),
  whois = require('../common/whoiswrapper.js'),
  conversions = require('../common/conversions.js'),
  debug = require('debug')('main.bulkwhois'),
  defaultBulkWhois = require('./bulkwhois/process.defaults.js');

require('./bulkwhois/fileinput.js');
require('./bulkwhois/wordlistinput.js');
require('./bulkwhois/export.js');
require('../common/stringformat.js');

var {
  appSettings
} = require('../appsettings.js');

var {
  resetObject
} = require('../common/resetobj.js');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

const {
  performance
} = require('perf_hooks');

var defaultValue = null; // Changing this implies changing all dependant comparisons
var bulkWhois; // BulkWhois object

// Bulk Domain whois lookup
ipcMain.on('bulkwhois:lookup', function(event, domains, tlds) {
  resetUiCounters(event); // Reset UI counters, pass window param
  bulkWhois = resetObject(defaultBulkWhois); // Reset var
  var {
    lookup,
    misc
  } = appSettings;

  var {
    results
  } = bulkWhois;

  bulkWhois.input.domains = domains; // Domain array
  bulkWhois.input.tlds = tlds; // TLDs array

  bulkWhois.stats.domains.total = bulkWhois.input.tlds.length * bulkWhois.input.domains.length; // Domain quantity times tld quantity
  event.sender.send('bulkwhois:status.update', 'domains.total', bulkWhois.stats.domains.total); // Display total amount of domains

  for (var j = 0; j < bulkWhois.input.tlds.length; j++) { // TLDs index
    for (var i = 0; i < bulkWhois.input.domains.length; i++) { // Domains index
      bulkWhois.stats.domains.processed = (i + 1) * (j + 1); // Total domains processed to queue
      event.sender.send('bulkwhois:status.update', 'domains.processed', bulkWhois.stats.domains.processed); // Display amount of domains processed to queue

      bulkWhois.input.domainsPending[bulkWhois.stats.domains.processed] = bulkWhois.input.domains[i] + '.' + bulkWhois.input.tlds[j];

      if (lookup.randomize.timebetween == true) { // Time between each request is random?
        timebetween = Math.floor((Math.random() * lookup.randomize.timebetweenmax) + lookup.randomize.timebetweenmin);
      } else {
        timebetween = lookup.timebetween;
      }

      (function(domain, y, z) { // y = i = Domain array index, and z = j = TLD array index
        id = (y + 1) * (z + 1);
        bulkWhois.processingIDs[id] = setTimeout(function() {

          var follow, timeout, timebetween, lastStatus, reqtime = [];

          if (lookup.randomize.follow === true) { // Request follow depth is randomized?
            follow = Math.floor((Math.random() * lookup.randomize.followmax) + lookup.randomize.followmin);
          } else {
            follow = lookup.follow;
          }

          if (lookup.randomize.timeout === true) { // Request timeout is randomized?
            timeout = Math.floor((Math.random() * lookup.randomize.timeoutmax) + lookup.randomize.timeoutmin);
          } else {
            timeout = lookup.timeout;
          }

          bulkWhois.stats.domains.sent++; // Requests sent
          event.sender.send('bulkwhois:status.update', 'domains.sent', bulkWhois.stats.domains.sent); // Requests sent, update stats

          bulkWhois.stats.domains.waiting++; // Waiting in queue
          event.sender.send('bulkwhois:status.update', 'domains.waiting', bulkWhois.stats.domains.waiting); // Waiting in queue, update stats

          reqtime[id] = performance.now();
          whois.lookup(domain, {
              "follow": follow,
              "timeout": timeout
            })
            .then(function(data) {
              reqtime[id] = performance.now() - reqtime[id];

              if (bulkWhois.stats.reqtimes.minimum == null || bulkWhois.stats.reqtimes.minimum > reqtime[id]) {
                bulkWhois.stats.reqtimes.minimum = reqtime[id].toFixed(2);
                event.sender.send('bulkwhois:status.update', 'reqtimes.minimum', bulkWhois.stats.reqtimes.minimum);
              }
              if (bulkWhois.stats.reqtimes.maximum == null || bulkWhois.stats.reqtimes.maximum < reqtime[id]) {
                bulkWhois.stats.reqtimes.maximum = reqtime[id].toFixed(2);
                event.sender.send('bulkwhois:status.update', 'reqtimes.maximum', bulkWhois.stats.reqtimes.maximum);
              }
              bulkWhois.stats.reqtimes.last = reqtime[id].toFixed(2);
              event.sender.send('bulkwhois:status.update', 'reqtimes.last', bulkWhois.stats.reqtimes.last);

              if (misc.asfoverride === true) {
                var lastweight = (bulkWhois.stats.domains.sent - bulkWhois.stats.domains.waiting) / bulkWhois.stats.domains.processed;
                bulkWhois.stats.reqtimes.average = ((bulkWhois.stats.reqtimes.average * lastweight) +
                  ((1 - lastweight) * reqtime[id].toFixed(2))).toFixed(2);
              } else {
                bulkWhois.stats.reqtimes.average = ((reqtime[id].toFixed(2) * misc.avgsmoothingfactor1) +
                  ((1 - misc.avgsmoothingfactor1) * bulkWhois.stats.reqtimes.average)).toFixed(2);
              }

              domainAvailable = whois.isDomainAvailable(data);

              switch (domainAvailable) {
                case 'available':
                  bulkWhois.stats.status.available++;
                  event.sender.send('bulkwhois:status.update', 'status.available', bulkWhois.stats.status.available);
                  bulkWhois.stats.laststatus.available = domain;
                  event.sender.send('bulkwhois:status.update', 'laststatus.available', bulkWhois.stats.laststatus.available);
                  lastStatus = 'available';
                  break;
                case 'unavailable':
                  bulkWhois.stats.status.unavailable++;
                  event.sender.send('bulkwhois:status.update', 'status.unavailable', bulkWhois.stats.status.unavailable);
                  bulkWhois.stats.laststatus.unavailable = domain;
                  event.sender.send('bulkwhois:status.update', 'laststatus.unavailable', bulkWhois.stats.laststatus.unavailable);
                  lastStatus = 'unavailable';
                  break;
                case 'querylimituniregistry':
                case 'error':
                  bulkWhois.stats.status.error++;
                  event.sender.send('bulkwhois:status.update', 'status.error', bulkWhois.stats.status.error);
                  bulkWhois.stats.laststatus.error = domain;
                  event.sender.send('bulkwhois:status.update', 'laststatus.error', bulkWhois.stats.laststatus.error);
                  lastStatus = 'error';
                  break;

              }

              debug('Average request time {0}ms'.format(bulkWhois.stats.reqtimes.average));

              event.sender.send('bulkwhois:status.update', 'reqtimes.average', bulkWhois.stats.reqtimes.average);
              event.sender.send('bulkwhois:results', domain, data);
              bulkWhois.stats.domains.waiting--; // Waiting in queue
              event.sender.send('bulkwhois:status.update', 'domains.waiting', bulkWhois.stats.domains.waiting); // Waiting in queue, update stats

              domainResultsJSON = whois.toJSON(data);

              results.id[id] = id;
              results.domain[id] = domain;
              results.status[id] = lastStatus;
              results.registrar[id] = domainResultsJSON['registrar'];
              results.company[id] = domainResultsJSON['registrantOrganization'] || domainResultsJSON['registrant'];
              results.updatedate[id] = domainResultsJSON['creationDate'] || domainResultsJSON['createdDate'] || domainResultsJSON['created'];
              results.creationdate[id] = domainResultsJSON['updatedDate'];
              results.expirydate[id] = domainResultsJSON['registrarRegistrationExpirationDate'] || domainResultsJSON['expires'];
              results.whoisreply[id] = data;
              results.whoisjson[id] = domainResultsJSON;
              results.requesttime[id] = reqtime[id];
            })
            .catch(function(data) {
              debug("An error ocurred while performing a whois lookup");
              reqtime[id] = performance.now() - reqtime[id];

              if (bulkWhois.stats.reqtimes.minimum == null || bulkWhois.stats.reqtimes.minimum > reqtime[id]) {
                bulkWhois.stats.reqtimes.minimum = reqtime[id].toFixed(2);
                event.sender.send('bulkwhois:status.update', 'reqtimes.minimum', bulkWhois.stats.reqtimes.minimum);
              }
              if (bulkWhois.stats.reqtimes.maximum == null || bulkWhois.stats.reqtimes.maximum < reqtime[id]) {
                bulkWhois.stats.reqtimes.maximum = reqtime[id].toFixed(2);
                event.sender.send('bulkwhois:status.update', 'reqtimes.maximum', bulkWhois.stats.reqtimes.maximum);
              }
              bulkWhois.stats.reqtimes.last = reqtime[id].toFixed(2);
              event.sender.send('bulkwhois:status.update', 'reqtimes.last', bulkWhois.stats.reqtimes.last);

              if (misc.asfoverride === true) {
                var lastweight = (bulkWhois.stats.domains.sent - bulkWhois.stats.domains.waiting) / bulkWhois.stats.domains.processed;
                bulkWhois.stats.reqtimes.average = ((bulkWhois.stats.reqtimes.average * lastweight) +
                  ((1 - lastweight) * reqtime[id].toFixed(2))).toFixed(2);
              } else {
                bulkWhois.stats.reqtimes.average = ((reqtime[id].toFixed(2) * misc.avgsmoothingfactor1) +
                  ((1 - misc.avgsmoothingfactor1) * bulkWhois.stats.reqtimes.average)).toFixed(2);
              }

              bulkWhois.stats.status.error++;
              event.sender.send('bulkwhois:status.update', 'status.error', bulkWhois.stats.status.error);
              bulkWhois.stats.laststatus.error = domain;
              event.sender.send('bulkwhois:status.update', 'laststatus.error', bulkWhois.stats.laststatus.error);

              debug('Average request time {0}ms'.format(bulkWhois.stats.reqtimes.average));

              event.sender.send('bulkwhois:status.update', 'reqtimes.average', bulkWhois.stats.reqtimes.average);
              event.sender.send('bulkwhois:results', domain, data);
              bulkWhois.stats.domains.waiting--; // Waiting in queue
              event.sender.send('bulkwhois:status.update', 'domains.waiting', bulkWhois.stats.domains.waiting); // Waiting in queue, update stats

              domainResultsJSON = whois.toJSON(data);

              results.id[id] = id;
              results.domain[id] = domain;
              results.status[id] = lastStatus;
              results.registrar[id] = domainResultsJSON['registrar'];
              results.company[id] = domainResultsJSON['registrantOrganization'] || domainResultsJSON['registrant'];
              results.updatedate[id] = domainResultsJSON['creationDate'] || domainResultsJSON['createdDate'] || domainResultsJSON['created'];
              results.creationdate[id] = domainResultsJSON['updatedDate'];
              results.expirydate[id] = domainResultsJSON['registrarRegistrationExpirationDate'] || domainResultsJSON['expires'];
              results.whoisreply[id] = data;
              results.whoisjson[id] = domainResultsJSON;
              results.requesttime[id] = reqtime[id];
            });
        }, timebetween * (y + 1) * (z + 1));
      }(bulkWhois.input.domains[i] + '.' + bulkWhois.input.tlds[j], i, j));
    }
  }

  if (lookup.randomize.timebetween === true) {
    bulkWhois.stats.time.remainingcounter = bulkWhois.stats.domains.total * lookup.randomize.timebetweenmax;
  } else {
    bulkWhois.stats.time.remainingcounter = bulkWhois.stats.domains.total * lookup.timebetween;
  }

  if (lookup.randomize.timeout === true) {
    bulkWhois.stats.time.remainingcounter += lookup.randomize.timeoutmax;
  } else {
    bulkWhois.stats.time.remainingcounter += lookup.timeout;
  }

  // Bulk whois counter/timer
  bulkWhois.stats.time.counter = setInterval(function() {
    bulkWhois.stats.time.currentcounter += 1000;
    bulkWhois.stats.time.remainingcounter -= 1000;
    if (bulkWhois.stats.time.remainingcounter <= 0) {
      bulkWhois.stats.time.remainingcounter = 0;
      bulkWhois.stats.time.remaining = '-';
    } else {
      bulkWhois.stats.time.remaining = conversions.msToHumanTime(bulkWhois.stats.time.remainingcounter);
    }
    bulkWhois.stats.time.current = conversions.msToHumanTime(bulkWhois.stats.time.currentcounter);


    event.sender.send('bulkwhois:status.update', 'time.current', bulkWhois.stats.time.current);
    event.sender.send('bulkwhois:status.update', 'time.remaining', bulkWhois.stats.time.remaining);
    if (bulkWhois.stats.domains.total == bulkWhois.stats.domains.sent && bulkWhois.stats.domains.waiting == 0) {
      clearTimeout(bulkWhois.stats.time.counter);
      event.sender.send('bulkwhois:status.update', 'finished');
    }
  }, 1000);
});

// Pause bulk whois process
ipcMain.on('bulkwhois:lookup.pause', function(event) {
  debug("Stopping unsent bulk whois requests");
  clearTimeout(bulkWhois.stats.time.counter); // Stop timers

  // Go through all queued domain lookups and delete setTimeouts for remaining domains
  for (var j = bulkWhois.stats.domains.sent; j < bulkWhois.stats.domains.processed; j++) {
    debug("Stopping whois request {0} with id {1}".format(j, bulkWhois.processingIDs[j]));
    clearTimeout(bulkWhois.processingIDs[j]);
  }
});

// Bulk domain, continue bulk whois process
ipcMain.on('bulkwhois:lookup.continue', function(event) {
  debug("Continuing bulk whois requests");

  // Go through the remaining domains and queue them again using setTimeouts
  var follow, timeout, timebetween;


  if (appSettings.lookup.randomize.timebetween == true) {
    timebetween = Math.floor((Math.random() * appSettings.lookup.randomize.timebetweenmax) + appSettings.lookup.randomize.timebetweenmin);
  } else {
    timebetween = appSettings.lookup.timebetween;
  }


  (function(domain, y) {

    if (appSettings.lookup.randomize.follow == true) {
      follow = Math.floor((Math.random() * appSettings.lookup.randomize.followmax) + appSettings.lookup.randomize.followmin);
    } else {
      follow = appSettings.lookup.follow;
    }
    if (appSettings.lookup.randomize.timeout == true) {
      timeout = Math.floor((Math.random() * appSettings.lookup.randomize.timeoutmax) + appSettings.lookup.randomize.timeoutmin);
    } else {
      timeout = appSettings.lookup.timeout;
    }
    bulkWhois.stats.domains.sent++; // Requests sent
    event.sender.send('bulkwhois:status.update', 'domains.sent', bulkWhois.stats.domains.sent); // Requests sent, update stats

    bulkWhois.stats.domains.waiting++; // Waiting in queue
    event.sender.send('bulkwhois:status.update', 'domains.waiting', bulkWhois.stats.domains.waiting); // Waiting in queue, update stats

    bulkWhois.processingIDs[y] = setTimeout(function() {
      console.log('pdomain->' + domain);
      whois.lookup(domain, {
          "follow": follow,
          "timeout": timeout
        })
        .then(function(data) {
          event.sender.send('bulkwhois:results', domain, data);
          bulkWhois.stats.domains.waiting--; // Waiting in queue
          event.sender.send('bulkwhois:status.update', 'domains.waiting', bulkWhois.stats.domains.waiting); // Waiting in queue, update stats

        })
        .catch(function(err) {
          event.sender.send('bulkwhois:results', domain, err);
          bulkWhois.stats.domains.waiting--; // Waiting in queue
          event.sender.send('bulkwhois:status.update', 'domains.waiting', bulkWhois.stats.domains.waiting); // Waiting in queue, update stats

        });
    }, timebetween * y);
  }(bulkWhois.input.domainsPending[j], j));


  // Set Timer
  bulkWhois.stats.time.counter = setInterval(function() {
    bulkWhois.stats.time.currentcounter += 1000;
    bulkWhois.stats.time.remainingcounter -= 1000;
    if (bulkWhois.stats.time.remainingcounter <= 0) {
      bulkWhois.stats.time.remainingcounter = 0;
    }
    bulkWhois.stats.time.current = conversions.msToHumanTime(bulkWhois.stats.time.currentcounter);
    bulkWhois.stats.time.remaining = conversions.msToHumanTime(bulkWhois.stats.time.remainingcounter);

    event.sender.send('bulkwhois:status.update', 'time.current', bulkWhois.stats.time.current);
    event.sender.send('bulkwhois:status.update', 'time.remaining', bulkWhois.stats.time.remaining);
    if (bulkWhois.stats.domains.total == bulkWhois.stats.domains.sent && bulkWhois.stats.domains.waiting == 0) {
      clearTimeout(bulkWhois.stats.time.counter);
      event.sender.send('bulkwhois:status.update', 'finished');
    }
  }, 1000);
});

// On drag and drop file
ipcMain.on('ondragstart', function(event, filePath) {
  event.sender.startDrag({
    file: filePath,
    icon: appSettings.window.icon
  });
  debug('File drag filepath: {0}'.format(filePath));
  event.sender.send('bulkwhois:fileinput.confirmation', filePath, true);
});

// Bulk domain, reset ui counters
function resetUiCounters(event) {
  //var send = event.sender.send;

  debug("Resetting bulk whois UI counters");


  var startingValue = 0;
  var defaultValue = '-';

  event.sender.send('bulkwhois:status.update', 'start');

  // Domains
  event.sender.send('bulkwhois:status.update', 'domains.total', startingValue);
  event.sender.send('bulkwhois:status.update', 'domains.waiting', startingValue);
  event.sender.send('bulkwhois:status.update', 'domains.sent', startingValue);
  event.sender.send('bulkwhois:status.update', 'domains.processed', startingValue);

  // Timers
  event.sender.send('bulkwhois:status.update', 'time.current', defaultValue);
  event.sender.send('bulkwhois:status.update', 'time.remaining', defaultValue);

  // Request Times
  event.sender.send('bulkwhois:status.update', 'reqtimes.maximum', startingValue);
  event.sender.send('bulkwhois:status.update', 'reqtimes.minimum', startingValue);
  event.sender.send('bulkwhois:status.update', 'reqtimes.last', startingValue);
  event.sender.send('bulkwhois:status.update', 'reqtimes.average', startingValue);

  // Status numerical
  event.sender.send('bulkwhois:status.update', 'status.available', startingValue);
  event.sender.send('bulkwhois:status.update', 'status.unavailable', startingValue);
  event.sender.send('bulkwhois:status.update', 'status.error', startingValue);

  // Status last domain
  event.sender.send('bulkwhois:status.update', 'laststatus.available', defaultValue);
  event.sender.send('bulkwhois:status.update', 'laststatus.unavailable', defaultValue);
  event.sender.send('bulkwhois:status.update', 'laststatus.error', defaultValue);

}

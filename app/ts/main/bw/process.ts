import electron from 'electron';
import type { IpcMainEvent } from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw.process');
import defaultBulkWhois from './process.defaults';

import type { BulkWhois, DomainSetup } from './types';
import { compileQueue, getDomainSetup } from './queue';
import { processDomain, counter } from './scheduler';
import { resetObject } from '../../common/resetObject';
import { resetUiCounters } from './auxiliary';

import { settings } from '../../common/settings';

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;
import { formatString } from '../../common/stringformat';

let bulkWhois: BulkWhois; // BulkWhois object
let reqtime: number[] = [];

/*
  ipcMain.on('bw:lookup', function(...) {...});
    On event: bulk whois lookup startup
  parameters
    event (object) - renderer event
    domains (array) - domains to request whois for
    tlds (array) - tlds to look for
 */
ipcMain.on('bw:lookup', function (event: IpcMainEvent, domains: string[], tlds: string[]) {
  resetUiCounters(event); // Reset UI counters, pass window param
  bulkWhois = resetObject(defaultBulkWhois); // Resets the bulkWhois object to default
  reqtime = [];

  // bulkWhois section
  const { results, input, stats, processingIDs } = bulkWhois;

  const {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  const {
    reqtimes, // request times
    status // request
  } = stats;

  const { sender } = event;

  let domainSetup;

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
  domainsPending.push(...compileQueue(input.domains, input.tlds, tldSeparator));

  // Process compiled domains into future requests
  for (const [index, domain] of domainsPending.entries()) {
    domainSetup = getDomainSetup(settings, {
      timeBetween: settings.lookupRandomizeTimeBetween.randomize,
      followDepth: settings.lookupRandomizeFollow.randomize,
      timeout: settings.lookupRandomizeTimeout.randomize
    });
    domainSetup.timebetween = settings.lookupGeneral.useDnsTimeBetweenOverride
      ? settings.lookupGeneral.dnsTimeBetween
      : domainSetup.timebetween;
    domainSetup.domain = domain;
    domainSetup.index = index;

    debug(
      formatString(
        'Using timebetween, {0}, follow, {1}, timeout, {2}',
        domainSetup.timebetween,
        domainSetup.follow,
        domainSetup.timeout
      )
    );

    processDomain(bulkWhois, reqtime, domainSetup, event);

    stats.domains.processed = domainSetup.index + 1;
    sender.send('bw:status.update', 'domains.processed', stats.domains.processed);
  } // End processing for loop

  settings.lookupRandomizeTimeBetween.randomize // Counter total time
    ? (stats.time.remainingcounter =
        stats.domains.total * settings.lookupRandomizeTimeBetween.maximum)
    : (stats.time.remainingcounter = stats.domains.total * settings.lookupGeneral.timeBetween);

  settings.lookupRandomizeTimeout.randomize // Counter add timeout
    ? (stats.time.remainingcounter += settings.lookupRandomizeTimeout.maximum)
    : (stats.time.remainingcounter += settings.lookupGeneral.timeout);

  counter(bulkWhois, event);
});

/*
  ipcMain.on('bw:lookup.pause', function(...) {...});
    On event: bulk whois lookup pause
  parameters
    event (object) - renderer event
 */
ipcMain.on('bw:lookup.pause', function (event: IpcMainEvent) {
  // bulkWhois section
  const { results, input, stats, processingIDs } = bulkWhois;

  const {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  debug('Stopping unsent bulk whois requests');
  counter(bulkWhois, event, false); // Stop counter/timer

  // Go through all queued domain lookups and delete setTimeouts for remaining domains
  for (let j = stats.domains.sent; j < stats.domains.processed; j++) {
    debug(formatString('Stopping whois request {0} with id {1}', j, processingIDs[j]));
    clearTimeout(processingIDs[j]);
  }
});

/*
  ipcMain.on('bw:lookup.continue', function(...) {...});
    On event: bulk whois lookup continue
  parameters
    event (object) - renderer object
 */
ipcMain.on('bw:lookup.continue', function (event: IpcMainEvent) {
  debug('Continuing bulk whois requests');

  // Go through the remaining domains and queue them again using setTimeouts
  let follow, timeout, timebetween;
  let domainSetup;

  // bulkWhois section
  const { results, input, stats, processingIDs } = bulkWhois;

  const {
    domainsPending, // Domains pending processing/requests
    tldSeparator // TLD separator
  } = input; // Bulk whois input

  const {
    reqtimes, // function request times
    status // request
  } = stats;

  const {
    sender // expose shorthand sender
  } = event;

  // Compile domains to process
  domainsPending.push(...compileQueue(input.domains, input.tlds, tldSeparator));

  // Do domain setup
  for (let domain = stats.domains.sent; domain < domainsPending.length; domain++) {
    domainSetup = getDomainSetup(settings, {
      timeBetween: settings.lookupRandomizeTimeBetween.randomize,
      followDepth: settings.lookupRandomizeFollow.randomize,
      timeout: settings.lookupRandomizeTimeout.randomize
    });
    domainSetup.timebetween = settings.lookupGeneral.useDnsTimeBetweenOverride
      ? settings.lookupGeneral.dnsTimeBetween
      : domainSetup.timebetween;
    domainSetup.domain = domainsPending[domain];
    domainSetup.index = Number(domain);

    debug(`${domainSetup.timebetween}`);

    /*
    timebetween = domainSetup.timebetween;
    follow = getFollowDepth(randomize.follow);
    timeout = getTimeout(randomize.timeout);
    */

    debug(domain);
    processDomain(bulkWhois, reqtime, domainSetup, event);

    stats.domains.processed = Number(domainSetup.index) + 1;
    sender.send('bw:status.update', 'domains.processed', stats.domains.processed);
  } // End processing for loop

  stats.time.remainingcounter = settings.lookupGeneral.useDnsTimeBetweenOverride
    ? settings.lookupRandomizeTimeBetween.randomize // Counter total time
      ? stats.domains.total * settings.lookupRandomizeTimeBetween.maximum
      : stats.domains.total * settings.lookupGeneral.timeBetween
    : settings.lookupGeneral.dnsTimeBetween;

  stats.time.remainingcounter += settings.lookupRandomizeTimeout.randomize // Counter add timeout
    ? settings.lookupRandomizeTimeout.maximum
    : settings.lookupGeneral.timeout;

  counter(bulkWhois, event); // Start counter/timer
});

/*
  ipcMain.on('bw:lookup.stop', function(...) {...});
    On event: stop bulk whois lookup process
  parameters
    event (object) - Current renderer object
 */
ipcMain.on('bw:lookup.stop', function (event: IpcMainEvent) {
  const { results, stats } = bulkWhois;

  const { sender } = event;

  clearTimeout(stats.time.counter!);
  sender.send('bw:result.receive', results);
  sender.send('bw:status.update', 'finished');
});

// Re-export for consumers that imported from this module previously
export { getDomainSetup } from './queue';

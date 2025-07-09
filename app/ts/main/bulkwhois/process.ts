import { ipcMain } from 'electron';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { debugFactory } from '../../common/logger.js';
const debug = debugFactory('bulkwhois.process');
import defaultBulkWhois from './process.defaults.js';

import type { BulkWhois } from './types.js';
import {
  compileDomains,
  createDomainSetup,
  updateProgress,
  setRemainingCounter,
  scheduleQueue
} from './helpers.js';
import { processDomain, counter } from './scheduler.js';
import { resetObject } from '../../common/resetObject.js';
import { resetUiCounters } from './auxiliary.js';

import { getSettings } from '../settings-main.js';
import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

let bulkWhois: BulkWhois; // BulkWhois object
let reqtime: number[] = [];

/*
  ipcMain.handle('bulkwhois:lookup', function(...) {...});
    Start bulk WHOIS lookup
  parameters
    event (object) - renderer event
    domains (array) - domains to request whois for
    tlds (array) - tlds to look for
*/
ipcMain.handle(
  IpcChannel.BulkwhoisLookup,
  (async function (
    event: IpcMainEvent,
    domains: string[],
    tlds: string[]
  ) {
  resetUiCounters(event); // Reset UI counters, pass window param
  bulkWhois = resetObject(defaultBulkWhois); // Resets the bulkWhois object to default
  reqtime = [];

  const settings = getSettings();

  const { sender } = event;
  compileDomains(bulkWhois, domains, tlds, sender);
  scheduleQueue(bulkWhois, reqtime, settings, event);

  setRemainingCounter(settings, bulkWhois.stats);

  counter(bulkWhois, event);
  return;
  }) as unknown as (
    event: IpcMainInvokeEvent,
    domains: string[],
    tlds: string[]
  ) => Promise<void>
);

/*
  ipcMain.on('bulkwhois:lookup.pause', function(...) {...});
    On event: bulk whois lookup pause
  parameters
    event (object) - renderer event
 */
ipcMain.on('bulkwhois:lookup.pause', function (event: IpcMainEvent) {
  // bulkWhois section
  const { results, input, stats, processingIDs } = bulkWhois;

  const { domainsPending } = input;

  debug('Stopping unsent bulk whois requests');
  counter(bulkWhois, event, false); // Stop counter/timer

  // Go through all queued domain lookups and delete setTimeouts for remaining domains
  for (let j = stats.domains.sent; j < stats.domains.processed; j++) {
    debug(formatString('Stopping whois request {0} with id {1}', j, processingIDs[j]));
    clearTimeout(processingIDs[j]);
  }
});

/*
  ipcMain.on('bulkwhois:lookup.continue', function(...) {...});
    On event: bulk whois lookup continue
  parameters
    event (object) - renderer object
 */
ipcMain.on('bulkwhois:lookup.continue', function (event: IpcMainEvent) {
  debug('Continuing bulk whois requests');

  const settings = getSettings();

  // Go through the remaining domains and queue them again using setTimeouts

  // bulkWhois section
  const { results, input, stats, processingIDs } = bulkWhois;

  const { domainsPending } = input;

  const { reqtimes, status } = stats;

  const {
    sender // expose shorthand sender
  } = event;

  compileDomains(bulkWhois, input.domains, input.tlds, sender);

  // Do domain setup
  let cumulativeDelay = 0;
  for (let domain = stats.domains.sent; domain < domainsPending.length; domain++) {
    const setup = createDomainSetup(settings, domainsPending[domain], Number(domain));

    debug(`${setup.timebetween}`);

    /*
    timebetween = domainSetup.timebetween;
    follow = getFollowDepth(randomize.follow);
    timeout = getTimeout(randomize.timeout);
    */

    debug(domain);
    cumulativeDelay += setup.timebetween;
    processDomain(bulkWhois, reqtime, setup, event, cumulativeDelay);
    updateProgress(sender, stats, Number(domain) + 1);
  } // End processing for loop

  setRemainingCounter(settings, stats);

  counter(bulkWhois, event); // Start counter/timer
});

/*
  ipcMain.on('bulkwhois:lookup.stop', function(...) {...});
    On event: stop bulk whois lookup process
  parameters
    event (object) - Current renderer object
 */
ipcMain.on('bulkwhois:lookup.stop', function (event: IpcMainEvent) {
  const { results, stats } = bulkWhois;

  const { sender } = event;

  clearInterval(stats.time.counter!);
  sender.send(IpcChannel.BulkwhoisResultReceive, results);
  sender.send(IpcChannel.BulkwhoisStatusUpdate, 'finished');
});

// Re-export for consumers that imported from this module previously
export { getDomainSetup } from './queue.js';

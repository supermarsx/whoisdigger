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
  setRemainingCounter
} from './helpers.js';
import { processDomain, counter } from './scheduler.js';
import { resetObject } from '../../common/resetObject.js';
import { resetUiCounters } from './auxiliary.js';

import { getSettings } from '../settings-main.js';
import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

class BulkWhoisManager {
  private bulkWhois: BulkWhois;
  private reqtime: number[];

  constructor() {
    this.bulkWhois = resetObject(defaultBulkWhois);
    this.reqtime = [];
  }

  private schedule(
    event: IpcMainEvent | IpcMainInvokeEvent,
    startIndex = 0
  ): void {
    const settings = getSettings();
    const { input, stats } = this.bulkWhois;
    const { domainsPending } = input;
    const { sender } = event;

    let cumulativeDelay = 0;
    for (let i = startIndex; i < domainsPending.length; i++) {
      const setup = createDomainSetup(settings, domainsPending[i], i);
      debug(
        formatString(
          'Using timebetween, {0}, follow, {1}, timeout, {2}',
          setup.timebetween,
          setup.follow,
          setup.timeout
        )
      );
      cumulativeDelay += setup.timebetween;
      processDomain(this.bulkWhois, this.reqtime, setup, event, cumulativeDelay);
      updateProgress(sender, stats, i + 1);
    }

    setRemainingCounter(settings, stats);
  }

  async startLookup(
    event: IpcMainInvokeEvent,
    domains: string[],
    tlds: string[]
  ): Promise<void> {
    resetUiCounters(event);
    this.bulkWhois = resetObject(defaultBulkWhois);
    this.reqtime = [];

    compileDomains(this.bulkWhois, domains, tlds, event.sender);
    this.schedule(event);
    counter(this.bulkWhois, event);
  }

  pause(event: IpcMainEvent): void {
    const { stats, processingIDs } = this.bulkWhois;
    debug('Stopping unsent bulk whois requests');
    counter(this.bulkWhois, event, false);
    for (let j = stats.domains.sent; j < stats.domains.processed; j++) {
      debug(formatString('Stopping whois request {0} with id {1}', j, processingIDs[j]));
      clearTimeout(processingIDs[j]);
    }
  }

  resume(event: IpcMainEvent): void {
    debug('Continuing bulk whois requests');
    const { input, stats } = this.bulkWhois;
    compileDomains(this.bulkWhois, input.domains, input.tlds, event.sender);
    this.schedule(event, stats.domains.sent);
    counter(this.bulkWhois, event);
  }

  stop(event: IpcMainEvent): void {
    const { results, stats } = this.bulkWhois;
    const { sender } = event;
    clearInterval(stats.time.counter!);
    sender.send(IpcChannel.BulkwhoisResultReceive, results);
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'finished');
  }
}

const manager = new BulkWhoisManager();

ipcMain.handle(IpcChannel.BulkwhoisLookup, (event, domains, tlds) =>
  manager.startLookup(event, domains, tlds)
);

ipcMain.on(IpcChannel.BulkwhoisLookupPause, (event) => manager.pause(event));

ipcMain.on(IpcChannel.BulkwhoisLookupContinue, (event) => manager.resume(event));

ipcMain.on(IpcChannel.BulkwhoisLookupStop, (event) => manager.stop(event));

// Re-export for consumers that imported from this module previously
export { getDomainSetup } from './queue.js';

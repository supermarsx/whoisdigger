import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { debugFactory } from '../../common/logger.js';
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

export class BulkWhoisManager {
  private bulkWhois: BulkWhois;
  private reqtime: number[] = [];
  private debug = debugFactory('bulkwhois.manager');

  constructor() {
    this.bulkWhois = resetObject(defaultBulkWhois);
  }

  private scheduleFrom(event: IpcMainEvent, start: number): void {
    const settings = getSettings();
    const { input, stats } = this.bulkWhois;
    const { sender } = event;
    let cumulativeDelay = 0;
    for (let domain = start; domain < input.domainsPending.length; domain++) {
      const setup = createDomainSetup(settings, input.domainsPending[domain], domain);
      this.debug(formatString('Scheduling domain %s with delay %s', domain, setup.timebetween));
      const delay = domain === start ? 0 : (cumulativeDelay += setup.timebetween);
      processDomain(this.bulkWhois, this.reqtime, setup, event, delay);
      updateProgress(sender, stats, domain + 1);
    }
    setRemainingCounter(settings, stats);
  }

  startLookup(event: IpcMainInvokeEvent, domains: string[], tlds: string[]): void {
    resetUiCounters(event as unknown as IpcMainEvent);
    this.bulkWhois = resetObject(defaultBulkWhois);
    this.reqtime = [];
    compileDomains(this.bulkWhois, domains, tlds, (event as IpcMainEvent).sender);
    this.scheduleFrom(event as unknown as IpcMainEvent, 0);
    counter(this.bulkWhois, event as unknown as IpcMainEvent);
  }

  pause(event: IpcMainEvent): void {
    const { stats, processingIDs } = this.bulkWhois;
    this.debug('Stopping unsent bulk whois requests');
    counter(this.bulkWhois, event, false);
    for (let j = stats.domains.sent; j < stats.domains.processed; j++) {
      this.debug(formatString('Stopping whois request %s with id %s', j, processingIDs[j]));
      clearTimeout(processingIDs[j]);
    }
  }

  resume(event: IpcMainEvent): void {
    this.debug('Continuing bulk whois requests');
    compileDomains(
      this.bulkWhois,
      this.bulkWhois.input.domains,
      this.bulkWhois.input.tlds,
      event.sender
    );
    this.scheduleFrom(event, this.bulkWhois.stats.domains.sent);
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

export { getDomainSetup } from './queue.js';

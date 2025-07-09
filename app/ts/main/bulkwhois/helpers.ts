import type { WebContents, IpcMainEvent } from 'electron';
import { IpcChannel } from '../../common/ipcChannels.js';
import type { BulkWhois, BulkWhoisStats, DomainSetup } from './types.js';
import { compileQueue, getDomainSetup } from './queue.js';
import type { Settings } from '../settings-main.js';
import { debugFactory } from '../../common/logger.js';
import { formatString } from '../../common/stringformat.js';
import { processDomain } from './scheduler.js';

export function compileDomains(
  bulk: BulkWhois,
  domains: string[],
  tlds: string[],
  sender: WebContents
): void {
  const { input, stats } = bulk;
  input.domains = domains;
  input.tlds = tlds;
  stats.domains.total = domains.length * tlds.length;
  sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.total', stats.domains.total);
  input.domainsPending.push(...compileQueue(domains, tlds, input.tldSeparator));
}

export function createDomainSetup(settings: Settings, domain: string, index: number): DomainSetup {
  const setup = getDomainSetup(settings, {
    timeBetween: settings.lookupRandomizeTimeBetween.randomize,
    followDepth: settings.lookupRandomizeFollow.randomize,
    timeout: settings.lookupRandomizeTimeout.randomize
  });
  setup.timebetween =
    settings.lookupGeneral.type === 'dns' && settings.lookupGeneral.dnsTimeBetweenOverride
      ? settings.lookupGeneral.dnsTimeBetween
      : setup.timebetween;
  setup.domain = domain;
  setup.index = index;
  return setup;
}

export function updateProgress(
  sender: WebContents,
  stats: BulkWhoisStats,
  processed: number
): void {
  stats.domains.processed = processed;
  sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.processed', stats.domains.processed);
}

export function setRemainingCounter(settings: Settings, stats: BulkWhoisStats): void {
  stats.time.remainingcounter = settings.lookupRandomizeTimeBetween.randomize
    ? stats.domains.total * settings.lookupRandomizeTimeBetween.maximum
    : stats.domains.total * settings.lookupGeneral.timeBetween;
  stats.time.remainingcounter += settings.lookupRandomizeTimeout.randomize
    ? settings.lookupRandomizeTimeout.maximum
    : settings.lookupGeneral.timeout;
}

const debug = debugFactory('bulkwhois.helpers');

export function scheduleQueue(
  bulk: BulkWhois,
  reqtimes: number[],
  settings: Settings,
  event: IpcMainEvent
): void {
  const { input, stats } = bulk;
  const { sender } = event;
  let cumulativeDelay = 0;
  for (const [index, domain] of input.domainsPending.entries()) {
    const setup = createDomainSetup(settings, domain, index);
    debug(
      formatString(
        'Using timebetween, {0}, follow, {1}, timeout, {2}',
        setup.timebetween,
        setup.follow,
        setup.timeout
      )
    );
    cumulativeDelay += setup.timebetween;
    processDomain(bulk, reqtimes, setup, event, cumulativeDelay);
    updateProgress(sender, stats, index + 1);
  }
}

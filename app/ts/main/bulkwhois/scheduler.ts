import { debugFactory } from '../../common/logger.js';
import { performance } from 'perf_hooks';
import { lookup as whoisLookup } from '../../common/lookup.js';
import * as dns from '../../common/dnsLookup.js';
import { Result, DnsLookupError } from '../../common/errors.js';
import { formatString } from '../../common/stringformat.js';
import { msToHumanTime } from '../../common/conversions.js';
import { getSettings } from '../settings-main.js';
import type { BulkWhois, DomainSetup } from './types.js';
import { processData } from './resultHandler.js';
import type { IpcMainEvent } from 'electron';
import { IpcChannel } from '../../common/ipcChannels.js';

const debug = debugFactory('bulkwhois.scheduler');

export function processDomain(
  bulkWhois: BulkWhois,
  reqtime: number[],
  domainSetup: DomainSetup,
  event: IpcMainEvent,
  delay: number
): void {
  debug(
    formatString(
      'Domain: {0}, id/index: {1}, timebetween: {2}',
      domainSetup.domain,
      domainSetup.index,
      domainSetup.timebetween
    )
  );

  const { stats, processingIDs } = bulkWhois;
  const { sender } = event;

  processingIDs[domainSetup.index!] = setTimeout(async () => {
    let data: any;
    const settings = getSettings();
    stats.domains.sent++;
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.sent', stats.domains.sent);
    stats.domains.waiting++;
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.waiting', stats.domains.waiting);

    reqtime[domainSetup.index!] = performance.now();

    debug(formatString('Looking up domain: {0}', domainSetup.domain));

    try {
      data =
        settings.lookupGeneral.type === 'whois'
          ? await whoisLookup(domainSetup.domain!, {
              follow: domainSetup.follow,
              timeout: domainSetup.timeout
            })
          : await dns.hasNsServers(domainSetup.domain!);
      await processData(
        bulkWhois,
        reqtime,
        event,
        domainSetup.domain!,
        domainSetup.index!,
        data,
        false
      );
    } catch (e) {
      debug(e);
    }
  }, delay);

  debug(formatString('Delay: {0}', delay));
}

export function counter(bulkWhois: BulkWhois, event: IpcMainEvent, start = true): void {
  const { results, stats } = bulkWhois;
  const { sender } = event;

  if (start) {
    stats.time.counter = setInterval(() => {
      stats.time.currentcounter += 1000;
      stats.time.remainingcounter -= 1000;
      if (stats.time.remainingcounter <= 0) {
        stats.time.remainingcounter = 0;
        bulkWhois.stats.time.remaining = '-';
      } else {
        stats.time.remaining = msToHumanTime(stats.time.remainingcounter);
      }
      stats.time.current = msToHumanTime(stats.time.currentcounter);
      sender.send(IpcChannel.BulkwhoisStatusUpdate, 'time.current', stats.time.current);
      sender.send(IpcChannel.BulkwhoisStatusUpdate, 'time.remaining', stats.time.remaining);
      if (stats.domains.total == stats.domains.sent && stats.domains.waiting === 0) {
        clearInterval(stats.time.counter!);
        sender.send(IpcChannel.BulkwhoisResultReceive, results);
        sender.send(IpcChannel.BulkwhoisStatusUpdate, 'finished');
      }
    }, 1000);
  } else {
    clearInterval(stats.time.counter!);
  }
}

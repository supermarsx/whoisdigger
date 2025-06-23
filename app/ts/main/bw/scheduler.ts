import debugModule from 'debug';
import { performance } from 'perf_hooks';
import { lookup as whoisLookup } from '../../common/lookup';
import * as dns from '../../common/dnsLookup';
import { Result, DnsLookupError } from '../../common/errors';
import { formatString } from '../../common/stringformat';
import { msToHumanTime } from '../../common/conversions';
import { loadSettings } from "../../common/settings";
import type { BulkWhois, DomainSetup } from './types';
import { processData } from './resultHandler';
import type { IpcMainEvent } from 'electron';

const debug = debugModule('main.bw.scheduler');

export function processDomain(
  bulkWhois: BulkWhois,
  reqtime: number[],
  domainSetup: DomainSetup,
  event: IpcMainEvent,
): void {
  debug(
    formatString(
      'Domain: {0}, id/index: {1}, timebetween: {2}',
      domainSetup.domain,
      domainSetup.index,
      domainSetup.timebetween,
    ),
  );

  const { stats, processingIDs } = bulkWhois;
  const { sender } = event;

  processingIDs[domainSetup.index!] = setTimeout(async () => {
    let data: any;
    stats.domains.sent++;
    sender.send('bw:status.update', 'domains.sent', stats.domains.sent);
    stats.domains.waiting++;
    sender.send('bw:status.update', 'domains.waiting', stats.domains.waiting);

    reqtime[domainSetup.index!] = await performance.now();

    debug(formatString('Looking up domain: {0}', domainSetup.domain));

    try {
      const settings = await loadSettings();
      data =
        settings['lookup.general'].type == 'whois'
          ? await whoisLookup(domainSetup.domain!, {
              follow: domainSetup.follow,
              timeout: domainSetup.timeout,
            })
          : await dns.hasNsServers(domainSetup.domain!);
      await processData(bulkWhois, reqtime, event, domainSetup.domain!, domainSetup.index!, data, false);
    } catch (e) {
      console.log(e);
      console.trace();
    }
  }, domainSetup.timebetween * (domainSetup.index! - stats.domains.sent + 1));

  debug(
    formatString(
      'Timebetween: {0}',
      domainSetup.timebetween * (domainSetup.index! - stats.domains.sent + 1),
    ),
  );
}

export function counter(
  bulkWhois: BulkWhois,
  event: IpcMainEvent,
  start = true,
): void {
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
      sender.send('bw:status.update', 'time.current', stats.time.current);
      sender.send('bw:status.update', 'time.remaining', stats.time.remaining);
      if (
        stats.domains.total == stats.domains.sent &&
        stats.domains.waiting === 0
      ) {
        clearTimeout(stats.time.counter!);
        sender.send('bw:result.receive', results);
        sender.send('bw:status.update', 'finished');
      }
    }, 1000);
  } else {
    clearTimeout(stats.time.counter!);
  }
}

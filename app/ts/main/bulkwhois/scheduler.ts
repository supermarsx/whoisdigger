import { debugFactory } from '../../common/logger.js';
import { performance } from 'perf_hooks';
import { lookup as whoisLookup, getWhoisOptions, convertDomain } from '../../common/lookup.js';
import * as dns from '../../common/dnsLookup.js';
import { rdapLookup, RdapResponse } from '../../common/rdapLookup.js';
import { Result, DnsLookupError } from '../../common/errors.js';
import { formatString } from '../../common/stringformat.js';
import { msToHumanTime } from '../../common/conversions.js';
import { getSettings } from '../settings-main.js';
import type { BulkWhois, DomainSetup } from './types.js';
import { processData } from './resultHandler.js';
import type { IpcMainEvent } from 'electron';
import { IpcChannel } from '../../common/ipcChannels.js';
import { runTask } from './workerPool.js';
import { reportProxyFailure, reportProxySuccess } from '#common/proxy';
import psl from 'psl';

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

  const isTest = !!(process && (process.env.JEST_WORKER_ID || (global as any).jest));
  processingIDs[domainSetup.index!] = setTimeout(async () => {
    let data: string | Result<boolean, DnsLookupError> | RdapResponse | null = null;
    const settings = getSettings();
    stats.domains.sent++;
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.sent', stats.domains.sent);
    stats.domains.waiting++;
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.waiting', stats.domains.waiting);

    reqtime[domainSetup.index!] = performance.now();

    debug(formatString('Looking up domain: {0}', domainSetup.domain));

    try {
      if (settings.lookupGeneral.type === 'whois') {
        // Prepare domain and options, run in worker pool with retry/backoff + proxy rotation
        if (isTest) {
          // Use direct call under tests so mocks work
          data = await whoisLookup(domainSetup.domain!, {
            follow: domainSetup.follow,
            timeout: domainSetup.timeout
          } as any);
        } else {
          let dom = convertDomain(domainSetup.domain!);
          if (settings.lookupGeneral.psl) {
            const clean = psl.get(dom);
            dom = clean ? clean.replace(/((\*\.)*)/g, '') : dom;
          }
          const maxRetries = Math.max(0, Number(getSettings().lookupProxy?.retries ?? 0));
          let attempt = 0;
          let lastErr: any = null;
          while (attempt <= maxRetries) {
            const opts = getWhoisOptions() as any;
            const usedProxy = opts?.proxy;
            const msg = await runTask({
              id: domainSetup.index!,
              domain: dom,
              type: 'whois',
              options: opts
            });
            if (msg && msg.ok) {
              if (usedProxy) reportProxySuccess(usedProxy);
              data = msg.data as string;
              break;
            } else {
              if (usedProxy) reportProxyFailure(usedProxy);
              lastErr = msg?.error || 'WHOIS_WORKER_FAILED';
              attempt++;
              if (attempt <= maxRetries) {
                const backoff = Math.min(2000, 250 * Math.pow(2, attempt - 1));
                await new Promise((r) => setTimeout(r, backoff));
              }
            }
          }
          if (data == null) throw new Error(String(lastErr || 'WHOIS_FAILED'));
        }
      } else if (settings.lookupGeneral.type === 'dns') {
        if (isTest) {
          const res = await dns.hasNsServers(domainSetup.domain!);
          data = res as any;
        } else {
          let dom = convertDomain(domainSetup.domain!);
          if (settings.lookupGeneral.psl) {
            const clean = psl.get(dom);
            dom = clean ? clean.replace(/((\*\.)*)/g, '') : dom;
          }
          const msg = await runTask({ id: domainSetup.index!, domain: dom, type: 'dns' });
          if (msg && msg.ok) {
            const has = !!msg.has;
            data = { ok: true, value: has } as Result<boolean, DnsLookupError>;
          } else {
            data = {
              ok: false,
              error: new DnsLookupError(String(msg?.error || 'DNS_FAILED'))
            } as Result<boolean, DnsLookupError>;
          }
        }
      } else {
        if (isTest) {
          data = await rdapLookup(domainSetup.domain!);
        } else {
          let dom = convertDomain(domainSetup.domain!);
          if (settings.lookupGeneral.psl) {
            const clean = psl.get(dom);
            dom = clean ? clean.replace(/((\*\.)*)/g, '') : dom;
          }
          const endpoints = (settings.lookupRdap?.endpoints as string[]) || [
            'https://rdap.org/domain/'
          ];
          const msg = await runTask({
            id: domainSetup.index!,
            domain: dom,
            type: 'rdap',
            options: { endpoints }
          });
          if (msg && msg.ok) {
            data = {
              statusCode: msg.statusCode as number,
              body: String(msg.body ?? '')
            } as RdapResponse;
          } else {
            throw new Error(String(msg?.error || 'RDAP_FAILED'));
          }
        }
      }
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
      // Ensure progress counters continue even on errors
      await processData(
        bulkWhois,
        reqtime,
        event,
        domainSetup.domain!,
        domainSetup.index!,
        null,
        true
      );
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

import debugModule from 'debug';
import { isDomainAvailable, getDomainParameters } from '../../common/availability';
import { toJSON } from '../../common/parser';
import { performance } from 'perf_hooks';
import { settings } from "../../common/settings";
import { formatString } from '../../common/stringformat';
import type { BulkWhois, ProcessedResult } from './types';
import * as dns from '../../common/dnsLookup';
import { Result, DnsLookupError } from '../../common/errors';
import type { IpcMainEvent } from 'electron';

const debug = debugModule('main.bulkwhois.resultHandler');

export async function processData(
  bulkWhois: BulkWhois,
  reqtime: number[],
  event: IpcMainEvent,
  domain: string,
  index: number,
  data: string | Result<boolean, DnsLookupError> | null = null,
  isError = false,
): Promise<void> {
  let lastweight: number;
  const { sender } = event;
  const { results, stats } = bulkWhois;
  const { reqtimes, status } = stats;
  let domainAvailable: string;
  let lastStatus: string | undefined;
  let resultsJSON: Record<string, unknown> | string;
  reqtime[index] = parseFloat((performance.now() - reqtime[index]).toFixed(2));

  if (reqtimes.minimum > reqtime[index]) {
    reqtimes.minimum = reqtime[index];
    sender.send('bulkwhois:status.update', 'reqtimes.minimum', reqtimes.minimum);
  }
  if (Number(reqtimes.maximum) < reqtime[index]) {
    reqtimes.maximum = reqtime[index].toFixed(2);
    sender.send('bulkwhois:status.update', 'reqtimes.maximum', reqtimes.maximum);
  }

  reqtimes.last = reqtime[index].toFixed(2);
  sender.send('bulkwhois:status.update', 'reqtimes.last', reqtimes.last);

  if (settings['lookup.misc'].asfOverride) {
    lastweight = Number(((stats.domains.sent - stats.domains.waiting) / stats.domains.processed).toFixed(2));
    reqtimes.average = (
      Number(reqtimes.average) * lastweight +
      (1 - lastweight) * reqtime[index]
    ).toFixed(2);
  } else {
    reqtimes.average = reqtimes.average || reqtime[index].toFixed(2);
    reqtimes.average = (
      reqtime[index] * settings['lookup.misc'].averageSmoothingFactor +
      (1 - settings['lookup.misc'].averageSmoothingFactor) * Number(reqtimes.average)
    ).toFixed(2);
  }

  if (isError) {
    status.error++;
    sender.send('bulkwhois:status.update', 'status.error', status.error);
    stats.laststatus.error = domain;
    sender.send('bulkwhois:status.update', 'laststatus.error', stats.laststatus.error);
  } else {
    domainAvailable =
      settings.lookupGeneral.type == 'whois'
        ? isDomainAvailable(data as string)
        : dns.isDomainAvailable(data as Result<boolean, DnsLookupError>);
    switch (domainAvailable) {
      case 'available':
        status.available++;
        sender.send('bulkwhois:status.update', 'status.available', status.available);
        stats.laststatus.available = domain;
        sender.send('bulkwhois:status.update', 'laststatus.available', stats.laststatus.available);
        lastStatus = 'available';
        break;
      case 'unavailable':
        status.unavailable++;
        sender.send('bulkwhois:status.update', 'status.unavailable', status.unavailable);
        stats.laststatus.unavailable = domain;
        sender.send('bulkwhois:status.update', 'laststatus.unavailable', stats.laststatus.unavailable);
        lastStatus = 'unavailable';
        break;
      default:
        if (domainAvailable.includes('error')) {
          status.error++;
          sender.send('bulkwhois:status.update', 'status.error', status.error);
          stats.laststatus.error = domain;
          sender.send('bulkwhois:status.update', 'laststatus.error', stats.laststatus.error);
          lastStatus = 'error';
        }
        break;
    }
  }

  debug(formatString('Average request time {0}ms', reqtimes.average));
  sender.send('bulkwhois:status.update', 'reqtimes.average', reqtimes.average);

  stats.domains.waiting--;
  sender.send('bulkwhois:status.update', 'domains.waiting', stats.domains.waiting);

  let resultFilter: ProcessedResult = {
    id: index + 1,
    domain: null,
    status: null,
    registrar: null,
    company: null,
    creationdate: null,
    updatedate: null,
    expirydate: null,
    whoisreply: null,
    whoisjson: null,
    requesttime: null,
  };

  if (settings.lookupGeneral.type == 'whois') {
    resultsJSON = toJSON(data as string);
    const params = getDomainParameters(domain, lastStatus ?? null, data as string, resultsJSON as Record<string, unknown>);
    resultFilter.domain = params.domain ?? null;
    resultFilter.status = params.status ?? null;
    resultFilter.registrar = params.registrar ?? null;
    resultFilter.company = params.company ?? null;
    resultFilter.creationdate = params.creationDate ?? null;
    resultFilter.updatedate = params.updateDate ?? null;
    resultFilter.expirydate = params.expiryDate ?? null;
    resultFilter.whoisreply = params.whoisreply ?? null;
    resultFilter.whoisjson = params.whoisJson ?? null;
  } else {
    resultFilter.domain = domain;
    resultFilter.status = lastStatus ?? null;
  }

  resultFilter.requesttime = reqtime[index];
  results.id[index] = resultFilter.id;
  results.domain[index] = resultFilter.domain;
  results.status[index] = resultFilter.status;
  results.registrar[index] = resultFilter.registrar;
  results.company[index] = resultFilter.company;
  results.creationdate[index] = resultFilter.creationdate;
  results.updatedate[index] = resultFilter.updatedate;
  results.expirydate[index] = resultFilter.expirydate;
  results.whoisreply[index] = resultFilter.whoisreply;
  results.whoisjson[index] = resultFilter.whoisjson as any;
  results.requesttime[index] = resultFilter.requesttime;
}

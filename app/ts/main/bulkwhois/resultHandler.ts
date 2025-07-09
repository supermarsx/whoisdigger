import { debugFactory } from '../../common/logger.js';
import { isDomainAvailable, getDomainParameters } from '../../common/availability.js';
import { toJSON } from '../../common/parser.js';
import { performance } from 'perf_hooks';
import { getSettings } from '../settings-main.js';
import { formatString } from '../../common/stringformat.js';
import type { BulkWhois, ProcessedResult } from './types.js';
import * as dns from '../../common/dnsLookup.js';
import { Result, DnsLookupError } from '../../common/errors.js';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { addEntry as addHistoryEntry } from '../../common/history.js';
import { IpcChannel } from '../../common/ipcChannels.js';

const debug = debugFactory('bulkwhois.resultHandler');

export async function processData(
  bulkWhois: BulkWhois,
  reqtime: number[],
  event: IpcMainEvent | IpcMainInvokeEvent,
  domain: string,
  index: number,
  data: string | Result<boolean, DnsLookupError> | null = null,
  isError = false
): Promise<void> {
  let lastweight: number;
  const { sender } = event;
  const { results, stats } = bulkWhois;
  const { reqtimes, status } = stats;
  let domainAvailable: string;
  let lastStatus: string | undefined;
  let resultsJSON: Record<string, unknown> | string;
  const settings = getSettings();
  reqtime[index] = parseFloat((performance.now() - reqtime[index]).toFixed(2));

  if (reqtimes.minimum > reqtime[index]) {
    reqtimes.minimum = reqtime[index];
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'reqtimes.minimum', reqtimes.minimum);
  }
  if (reqtimes.maximum === null || reqtimes.maximum < reqtime[index]) {
    reqtimes.maximum = parseFloat(reqtime[index].toFixed(2));
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'reqtimes.maximum', reqtimes.maximum);
  }

  reqtimes.last = parseFloat(reqtime[index].toFixed(2));
  sender.send(IpcChannel.BulkwhoisStatusUpdate, 'reqtimes.last', reqtimes.last);

  if (settings.lookupMisc.asfOverride) {
    lastweight = Number(
      ((stats.domains.sent - stats.domains.waiting) / stats.domains.processed).toFixed(2)
    );
    reqtimes.average = parseFloat(
      (
        (reqtimes.average ?? reqtime[index]) * lastweight +
        (1 - lastweight) * reqtime[index]
      ).toFixed(2)
    );
  } else {
    reqtimes.average = reqtimes.average ?? reqtime[index];
    reqtimes.average = parseFloat(
      (
        reqtime[index] * settings.lookupMisc.averageSmoothingFactor +
        (1 - settings.lookupMisc.averageSmoothingFactor) * reqtimes.average
      ).toFixed(2)
    );
  }

  if (isError) {
    status.error++;
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'status.error', status.error);
    stats.laststatus.error = domain;
    sender.send(IpcChannel.BulkwhoisStatusUpdate, 'laststatus.error', stats.laststatus.error);
  } else {
    domainAvailable =
      settings.lookupGeneral.type == 'whois'
        ? isDomainAvailable(data as string)
        : dns.isDomainAvailable(data as Result<boolean, DnsLookupError>);
    switch (domainAvailable) {
      case 'available':
        status.available++;
        sender.send(IpcChannel.BulkwhoisStatusUpdate, 'status.available', status.available);
        stats.laststatus.available = domain;
        sender.send(
          IpcChannel.BulkwhoisStatusUpdate,
          'laststatus.available',
          stats.laststatus.available
        );
        lastStatus = 'available';
        break;
      case 'unavailable':
        status.unavailable++;
        sender.send(IpcChannel.BulkwhoisStatusUpdate, 'status.unavailable', status.unavailable);
        stats.laststatus.unavailable = domain;
        sender.send(
          IpcChannel.BulkwhoisStatusUpdate,
          'laststatus.unavailable',
          stats.laststatus.unavailable
        );
        lastStatus = 'unavailable';
        break;
      default:
        if (domainAvailable.includes('error')) {
          status.error++;
          sender.send(IpcChannel.BulkwhoisStatusUpdate, 'status.error', status.error);
          stats.laststatus.error = domain;
          sender.send(IpcChannel.BulkwhoisStatusUpdate, 'laststatus.error', stats.laststatus.error);
          lastStatus = 'error';
        }
        break;
    }
  }

  debug(formatString('Average request time {0}ms', reqtimes.average));
  sender.send(IpcChannel.BulkwhoisStatusUpdate, 'reqtimes.average', reqtimes.average);

  stats.domains.waiting--;
  sender.send(IpcChannel.BulkwhoisStatusUpdate, 'domains.waiting', stats.domains.waiting);

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
    requesttime: null
  };

  if (settings.lookupGeneral.type == 'whois') {
    resultsJSON = toJSON(data as string);
    const params = getDomainParameters(
      domain,
      lastStatus ?? null,
      data as string,
      resultsJSON as Record<string, unknown>
    );
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
  if (resultFilter.domain && resultFilter.status) {
    addHistoryEntry(resultFilter.domain, resultFilter.status);
  }
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

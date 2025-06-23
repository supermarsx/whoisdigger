import debugModule from 'debug';
import { isDomainAvailable, getDomainParameters } from '../../common/availability';
import { toJSON } from '../../common/parser';
import { performance } from 'perf_hooks';
import { loadSettings } from "../../common/settings";
import { formatString } from '../../common/stringformat';
import type { BulkWhois } from './types';
import * as dns from '../../common/dnsLookup';
import { Result, DnsLookupError } from '../../common/errors';
import type { IpcMainEvent } from 'electron';

const debug = debugModule('main.bw.resultHandler');

export async function processData(
  bulkWhois: BulkWhois,
  reqtime: any[],
  event: IpcMainEvent,
  domain: string,
  index: number,
  data: string | Result<boolean, DnsLookupError> | null = null,
  isError = false,
): Promise<void> {
  const settings = await loadSettings();
  let lastweight: number;
  const { sender } = event;
  const { results, stats } = bulkWhois;
  const { reqtimes, status } = stats;
  let domainAvailable: string;
  let lastStatus: string | undefined;
  let resultsJSON: any;

  reqtime[index] = Number(performance.now() - reqtime[index]).toFixed(2);

  if (Number(reqtimes.minimum) > Number(reqtime[index])) {
    reqtimes.minimum = reqtime[index];
    sender.send('bw:status.update', 'reqtimes.minimum', reqtimes.minimum);
  }
  if (Number(reqtimes.maximum) < Number(reqtime[index])) {
    reqtimes.maximum = reqtime[index];
    sender.send('bw:status.update', 'reqtimes.maximum', reqtimes.maximum);
  }

  reqtimes.last = reqtime[index];
  sender.send('bw:status.update', 'reqtimes.last', reqtimes.last);

  if (settings['lookup.misc'].asfOverride) {
    lastweight = Number(((stats.domains.sent - stats.domains.waiting) / stats.domains.processed).toFixed(2));
    reqtimes.average = (
      Number(reqtimes.average) * lastweight +
      (1 - lastweight) * Number(reqtime[index])
    ).toFixed(2);
  } else {
    reqtimes.average = reqtimes.average || reqtime[index];
    reqtimes.average = (
      Number(reqtime[index]) * settings['lookup.misc'].averageSmoothingFactor +
      (1 - settings['lookup.misc'].averageSmoothingFactor) * Number(reqtimes.average)
    ).toFixed(2);
  }

  if (isError) {
    status.error++;
    sender.send('bw:status.update', 'status.error', status.error);
    stats.laststatus.error = domain;
    sender.send('bw:status.update', 'laststatus.error', stats.laststatus.error);
  } else {
    domainAvailable =
      settings['lookup.general'].type == 'whois'
        ? isDomainAvailable(data as string)
        : dns.isDomainAvailable(data as Result<boolean, DnsLookupError>);
    switch (domainAvailable) {
      case 'available':
        status.available++;
        sender.send('bw:status.update', 'status.available', status.available);
        stats.laststatus.available = domain;
        sender.send('bw:status.update', 'laststatus.available', stats.laststatus.available);
        lastStatus = 'available';
        break;
      case 'unavailable':
        status.unavailable++;
        sender.send('bw:status.update', 'status.unavailable', status.unavailable);
        stats.laststatus.unavailable = domain;
        sender.send('bw:status.update', 'laststatus.unavailable', stats.laststatus.unavailable);
        lastStatus = 'unavailable';
        break;
      default:
        if (domainAvailable.includes('error')) {
          status.error++;
          sender.send('bw:status.update', 'status.error', status.error);
          stats.laststatus.error = domain;
          sender.send('bw:status.update', 'laststatus.error', stats.laststatus.error);
          lastStatus = 'error';
        }
        break;
    }
  }

  debug(formatString('Average request time {0}ms', reqtimes.average));
  sender.send('bw:status.update', 'reqtimes.average', reqtimes.average);

  stats.domains.waiting--;
  sender.send('bw:status.update', 'domains.waiting', stats.domains.waiting);

  let resultFilter: any = {
    domain: '',
    status: '',
    registrar: '',
    company: '',
    creationdate: '',
    updatedate: '',
    expirydate: '',
    whoisreply: '',
    whoisjson: '',
  };

  if (settings['lookup.general'].type == 'whois') {
    resultsJSON = toJSON(data as string);
    resultFilter = getDomainParameters(domain, lastStatus ?? null, data as string, resultsJSON);
  } else {
    resultFilter.domain = domain;
    resultFilter.status = lastStatus ?? null;
    resultFilter.registrar = null;
    resultFilter.company = null;
    resultFilter.creationdate = null;
    resultFilter.updatedate = null;
    resultFilter.expirydate = null;
    resultFilter.whoisreply = null;
    resultFilter.whoisjson = null;
  }

  results.id[index] = Number(index + 1);
  results.domain[index] = resultFilter.domain;
  results.status[index] = resultFilter.status;
  results.registrar[index] = resultFilter.registrar;
  results.company[index] = resultFilter.company;
  results.creationdate[index] = resultFilter.creationdate;
  results.updatedate[index] = resultFilter.updatedate;
  results.expirydate[index] = resultFilter.expirydate;
  results.whoisreply[index] = resultFilter.whoisreply;
  results.whoisjson[index] = resultFilter.whoisjson;
  results.requesttime[index] = reqtime[index];
}

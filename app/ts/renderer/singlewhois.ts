import type { WhoisResult } from '../common/availability.js';
import { preStringStrip, toJSON } from '../common/parser.js';

import { getDate } from '../common/conversions.js';
import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI;
import { IpcChannel } from '../common/ipcChannels.js';
import { formatString } from '../common/stringformat.js';

import { debugFactory, errorFactory } from '../common/logger.js';
import DomainStatus from '../common/status.js';

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}

const debug = debugFactory('renderer.singlewhois');
const error = errorFactory('renderer.singlewhois');
debug('loaded');

interface SingleWhois {
  input: {
    domain: string | null;
  };
  results: unknown | null;
}

const singleWhois: SingleWhois = {
  input: {
    domain: null
  },
  results: null
};

/*
  handleResults
    Process returned whois data
  parameters
    domainResults (object) - Domain results object
*/
async function handleResults(domainResults: string) {
  let domainName: string;
  let domainStatus: string;
  let domainResultsJSON: Record<string, unknown>;
  let resultFilter: WhoisResult;
  let errorReason: string | undefined;
  //electron.send('app:debug', "Whois domain reply:\n {0}".format(domainResults));

  domainResults = preStringStrip(domainResults);
  domainResultsJSON = toJSON(domainResults) as Record<string, unknown>;

  // Check domain status
  domainName =
    (domainResultsJSON.domainName as string | undefined) ||
    (domainResultsJSON.domain as string | undefined) ||
    '';

  domainStatus = await electron.invoke(IpcChannel.AvailabilityCheck, domainResults);
  resultFilter = await electron.invoke(
    IpcChannel.DomainParameters,
    domainName,
    domainStatus,
    domainResults,
    domainResultsJSON
  );

  const { domain, updateDate, registrar, creationDate, company, expiryDate } = resultFilter;

  switch (domainStatus) {
    case DomainStatus.Unavailable:
      qs('#singlewhoisMessageUnavailable')?.classList.remove('is-hidden');
      if (qs('#singlewhoisMessageWhoisResults'))
        qs('#singlewhoisMessageWhoisResults')!.textContent = domainResults;

      qs('#singlewhoisTdDomain')?.setAttribute('url', 'http://' + (domain ?? ''));
      if (qs('#singlewhoisTdDomain'))
        qs('#singlewhoisTdDomain')!.textContent = domain ?? '';

      if (qs('#singlewhoisTdUpdate'))
        qs('#singlewhoisTdUpdate')!.textContent = updateDate ?? '';
      if (qs('#singlewhoisTdRegistrar'))
        qs('#singlewhoisTdRegistrar')!.textContent = registrar ?? '';
      if (qs('#singlewhoisTdCreation'))
        qs('#singlewhoisTdCreation')!.textContent = creationDate ?? '';
      if (qs('#singlewhoisTdCompany'))
        qs('#singlewhoisTdCompany')!.textContent = company ?? '';
      if (qs('#singlewhoisTdExpiry'))
        qs('#singlewhoisTdExpiry')!.textContent = expiryDate ?? '';
      qs('#singlewhoisTableWhoisinfo.is-hidden')?.classList.remove('is-hidden');
      break;

    case DomainStatus.Available:
      if (qs('#singlewhoisMessageWhoisResults'))
        qs('#singlewhoisMessageWhoisResults')!.textContent = domainResults;
      qs('#singlewhoisMessageAvailable')?.classList.remove('is-hidden');
      break;

    default:
      if (domainStatus.includes('error')) {
        errorReason = domainStatus.split(':')[1];
        if (qs('#singlewhoisMessageWhoisResults'))
          qs('#singlewhoisMessageWhoisResults')!.textContent = formatString(
            'Whois error due to {0}:\n{1}',
            errorReason,
            domainResults
          );
        qs('#singlewhoisMessageError')?.classList.remove('is-hidden');
      } else {
        if (qs('#singlewhoisMessageWhoisResults'))
          qs('#singlewhoisMessageWhoisResults')!.textContent = formatString(
            'Whois default error\n{0}',
            domainResults
          );
        qs('#singlewhoisMessageError')?.classList.remove('is-hidden');
      }
      break;
  }

  qs('#singlewhoisSearchButtonSearch')?.classList.remove('is-loading');
  qs('#singlewhoisSearchInputDomain')?.removeAttribute('readonly');
}

/*
  electron.on('singlewhois:copied', function() {...});
    On event: Domain copied
 */
electron.on('singlewhois:copied', function () {
  qs('#singlewhoisDomainCopied')?.classList.add('is-active');

  return;
});

/*
  On keyup: Trigger search event with [ENTER] key
 */
qs('#singlewhoisSearchInputDomain')?.addEventListener('keyup', (event: KeyboardEvent) => {
  event.preventDefault();
  if (event.key === 'Enter') {
    qs('#singlewhoisSearchButtonSearch')?.dispatchEvent(new Event('click'));
  }

  return;
});

/*
  On click: Open website for domain lookup URL in a new window
 */
qs('#singlewhoisTdDomain')?.addEventListener('click', () => {
  const domain = qs('#singlewhoisTdDomain')?.getAttribute('url') as string;
  electron.send('singlewhois:openlink', domain);

  return;
});

/*
  On click: Single whois lookup/search button
 */
qs('#singlewhoisSearchButtonSearch')?.addEventListener('click', function () {
  const { input } = singleWhois;
  let { domain } = input;

  if ((this as HTMLElement).classList.contains('is-loading')) return true;
  debug('#singlewhoisSearchButtonSearch was clicked');

  domain = (qs('#singlewhoisSearchInputDomain') as HTMLInputElement | null)?.value as string;

  debug(formatString('Looking up for {0}', domain));

  qs('#singlewhoisSearchButtonSearch')?.classList.add('is-loading');
  qs('#singlewhoisSearchInputDomain')?.setAttribute('readonly', '');
  qsa('.notification:not(.is-hidden)').forEach((el) => el.classList.add('is-hidden'));
  qs('#singlewhoisTableWhoisinfo:not(.is-hidden)')?.classList.add('is-hidden');
  tableReset();
  void (async () => {
    try {
      const result = await electron.invoke(IpcChannel.SingleWhoisLookup, domain);
      await handleResults(result);
    } catch (e) {
      error(`Lookup failed: ${e}`);
      qs('#singlewhoisSearchButtonSearch')?.classList.remove('is-loading');
      qs('#singlewhoisSearchInputDomain')?.removeAttribute('readonly');
    }
  })();
  return undefined;
});

/*
  On click: Single whois lookup modal open click
 */
qsa('.singlewhoisMessageWhoisOpen').forEach((el) => {
  el.addEventListener('click', () => {
    debug('Opening whois reply');
    qs('#singlewhoisMessageWhois')?.classList.add('is-active');

    return;
  });
});

/*
  On click: Single whois lookup modal close click
 */
qs('#singlewhoisMessageWhoisClose')?.addEventListener('click', () => {
  debug('Closing whois reply');
  qs('#singlewhoisMessageWhois')?.classList.remove('is-active');

  return;
});

/*
  On click: Domain copied close click
 */
qs('#singlewhoisDomainCopiedClose')?.addEventListener('click', () => {
  debug('Closing domain copied');
  qs('#singlewhoisDomainCopied')?.classList.remove('is-active');

  return;
});

/*
  tableReset
    Resets registry table contents
 */
function tableReset() {
  debug('Resetting whois result table');
  qs('#singlewhoisTdDomain')?.setAttribute('href', '#');
  if (qs('#singlewhoisTdDomain')) qs('#singlewhoisTdDomain')!.textContent = 'n/a';
  if (qs('#singlewhoisTdUpdate')) qs('#singlewhoisTdUpdate')!.textContent = 'n/a';
  if (qs('#singlewhoisTdRegistrar')) qs('#singlewhoisTdRegistrar')!.textContent = 'n/a';
  if (qs('#singlewhoisTdCreation')) qs('#singlewhoisTdCreation')!.textContent = 'n/a';
  if (qs('#singlewhoisTdCompany')) qs('#singlewhoisTdCompany')!.textContent = 'n/a';
  if (qs('#singlewhoisTdExpiry')) qs('#singlewhoisTdExpiry')!.textContent = 'n/a';

  return;
}

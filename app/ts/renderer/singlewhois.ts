import type { WhoisResult } from '../common/availability.js';
import { preStringStrip, toJSON } from '../common/parser.js';

import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI;
import { IpcChannel } from '../common/ipcChannels.js';
import { formatString } from '../common/stringformat.js';

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}
import { debugFactory, errorFactory } from '../common/logger.js';
import DomainStatus from '../common/status.js';

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
  const resultsEl = qs('#singlewhoisMessageWhoisResults');
  const domainEl = qs('#singlewhoisTdDomain');
  const updateEl = qs('#singlewhoisTdUpdate');
  const registrarEl = qs('#singlewhoisTdRegistrar');
  const creationEl = qs('#singlewhoisTdCreation');
  const companyEl = qs('#singlewhoisTdCompany');
  const expiryEl = qs('#singlewhoisTdExpiry');

  switch (domainStatus) {
    case DomainStatus.Unavailable:
      qs('#singlewhoisMessageUnavailable')?.classList.remove('is-hidden');
      if (resultsEl) resultsEl.textContent = domainResults;

      domainEl?.setAttribute('url', 'http://' + (domain ?? ''));
      if (domainEl) domainEl.textContent = domain ?? '';

      if (updateEl) updateEl.textContent = updateDate ?? '';
      if (registrarEl) registrarEl.textContent = registrar ?? '';
      if (creationEl) creationEl.textContent = creationDate ?? '';
      if (companyEl) companyEl.textContent = company ?? '';
      if (expiryEl) expiryEl.textContent = expiryDate ?? '';
      qs('#singlewhoisTableWhoisinfo')?.classList.remove('is-hidden');
      break;

    case DomainStatus.Available:
      if (resultsEl) resultsEl.textContent = domainResults;
      qs('#singlewhoisMessageAvailable')?.classList.remove('is-hidden');
      break;

    default:
      if (domainStatus.includes('error')) {
        errorReason = domainStatus.split(':')[1]; // Get Error reason
        if (resultsEl)
          resultsEl.textContent = formatString(
            'Whois error due to {0}:\n{1}',
            errorReason,
            domainResults
          );
        qs('#singlewhoisMessageError')?.classList.remove('is-hidden');
      } else {
        if (resultsEl)
          resultsEl.textContent = formatString(
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
});

/*
  $('#singlewhoisSearchInputDomain').keyup(function(...) {...});
    On keyup: Trigger search event with [ENTER] key
 */
qs('#singlewhoisSearchInputDomain')?.addEventListener('keyup', (event) => {
  event.preventDefault();
  if ((event as KeyboardEvent).key === 'Enter') {
    qs('#singlewhoisSearchButtonSearch')?.dispatchEvent(new Event('click'));
  }
});

/*
  $('#singlewhoisTdDomain').click(function() {...});
    On click: Open website for domain lookup URL in a new window
 */
qs('#singlewhoisTdDomain')?.addEventListener('click', () => {
  const domain = qs('#singlewhoisTdDomain')?.getAttribute('url') ?? '';
  electron.send('singlewhois:openlink', domain);
});

/*
  $('#singlewhoisSearchButtonSearch').click(function() {...});
    On click: Single whois lookup/search button
 */
qs('#singlewhoisSearchButtonSearch')?.addEventListener('click', function () {
  const { input } = singleWhois;
  let { domain } = input;

  const btn = this as HTMLElement;
  if (btn.classList.contains('is-loading')) return;
  debug('#singlewhoisSearchButtonSearch was clicked');

  const val = (qs('#singlewhoisSearchInputDomain') as HTMLInputElement | null)?.value;
  domain = val ?? '';

  debug(formatString('Looking up for {0}', domain));

  btn.classList.add('is-loading');
  qs('#singlewhoisSearchInputDomain')?.setAttribute('readonly', '');
  qsa('.notification:not(.is-hidden)').forEach((el) => el.classList.add('is-hidden'));
  qs('#singlewhoisTableWhoisinfo')?.classList.add('is-hidden');
  tableReset();
  void (async () => {
    try {
      const result = await electron.invoke(IpcChannel.SingleWhoisLookup, domain);
      await handleResults(result);
    } catch (e) {
      error(`Lookup failed: ${e}`);
      btn.classList.remove('is-loading');
      qs('#singlewhoisSearchInputDomain')?.removeAttribute('readonly');
    }
  })();
  return undefined;
});

/*
  $('.singlewhoisMessageWhoisOpen').click(function() {...});
    On click: Single whois lookup modal open click
 */
qsa('.singlewhoisMessageWhoisOpen').forEach((el) => {
  el.addEventListener('click', () => {
    debug('Opening whois reply');
    qs('#singlewhoisMessageWhois')?.classList.add('is-active');
  });
});

/*
  $('#singlewhoisMessageWhoisClose').click(function() {...});
    On click: Single whois lookup modal close click
 */
qs('#singlewhoisMessageWhoisClose')?.addEventListener('click', () => {
  debug('Closing whois reply');
  qs('#singlewhoisMessageWhois')?.classList.remove('is-active');
});

/*
  $('#singlewhoisDomainCopiedClose').click(function() {...});
    On click: Domain copied close click
 */
qs('#singlewhoisDomainCopiedClose')?.addEventListener('click', () => {
  debug('Closing domain copied');
  qs('#singlewhoisDomainCopied')?.classList.remove('is-active');
});

/*
  tableReset
    Resets registry table contents
 */
function tableReset() {
  debug('Resetting whois result table');
  const domain = qs('#singlewhoisTdDomain');
  domain?.setAttribute('href', '#');
  if (domain) domain.textContent = 'n/a';
  const update = qs('#singlewhoisTdUpdate');
  if (update) update.textContent = 'n/a';
  const reg = qs('#singlewhoisTdRegistrar');
  if (reg) reg.textContent = 'n/a';
  const creation = qs('#singlewhoisTdCreation');
  if (creation) creation.textContent = 'n/a';
  const company = qs('#singlewhoisTdCompany');
  if (company) company.textContent = 'n/a';
  const expiry = qs('#singlewhoisTdExpiry');
  if (expiry) expiry.textContent = 'n/a';
}

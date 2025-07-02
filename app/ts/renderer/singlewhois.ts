import type { WhoisResult } from '../common/availability.js';
import { preStringStrip, toJSON } from '../common/parser.js';

import { getDate } from '../common/conversions.js';
const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};
import { IpcChannel } from '../common/ipcChannels.js';
import { formatString } from '../common/stringformat.js';

import $ from '../../vendor/jquery.js';
(window as any).$ = (window as any).jQuery = $;

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
    case 'unavailable':
      $('#singlewhoisMessageUnavailable').removeClass('is-hidden');
      $('#singlewhoisMessageWhoisResults').text(domainResults);

      $('#singlewhoisTdDomain').attr('url', 'http://' + (domain ?? ''));
      $('#singlewhoisTdDomain').text(domain ?? '');

      $('#singlewhoisTdUpdate').text(updateDate ?? '');
      $('#singlewhoisTdRegistrar').text(registrar ?? '');
      $('#singlewhoisTdCreation').text(creationDate ?? '');
      $('#singlewhoisTdCompany').text(company ?? '');
      $('#singlewhoisTdExpiry').text(expiryDate ?? '');
      $('#singlewhoisTableWhoisinfo.is-hidden').removeClass('is-hidden');
      break;

    case 'available':
      $('#singlewhoisMessageWhoisResults').text(domainResults);
      $('#singlewhoisMessageAvailable').removeClass('is-hidden');
      break;

    default:
      if (domainStatus.includes('error')) {
        errorReason = domainStatus.split(':')[1]; // Get Error reason
        $('#singlewhoisMessageWhoisResults').text(
          formatString('Whois error due to {0}:\n{1}', errorReason, domainResults)
        );
        $('#singlewhoisMessageError').removeClass('is-hidden');
      } else {
        $('#singlewhoisMessageWhoisResults').text(
          formatString('Whois default error\n{0}', domainResults)
        );
        $('#singlewhoisMessageError').removeClass('is-hidden');
      }
      break;
  }

  $('#singlewhoisSearchButtonSearch').removeClass('is-loading');
  $('#singlewhoisSearchInputDomain').removeAttr('readonly');
}

/*
  electron.on('singlewhois:copied', function() {...});
    On event: Domain copied
 */
  electron.on('singlewhois:copied', function () {
  $('#singlewhoisDomainCopied').addClass('is-active');

  return;
});

/*
  $('#singlewhoisSearchInputDomain').keyup(function(...) {...});
    On keyup: Trigger search event with [ENTER] key
 */
$('#singlewhoisSearchInputDomain').keyup(function (event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) $('#singlewhoisSearchButtonSearch').click();

  return;
});

/*
  $('#singlewhoisTdDomain').click(function() {...});
    On click: Open website for domain lookup URL in a new window
 */
$(document).on('click', '#singlewhoisTdDomain', function () {
  const domain = $('#singlewhoisTdDomain').attr('url') as string;
  electron.send('singlewhois:openlink', domain);

  return;
});

/*
  $('#singlewhoisSearchButtonSearch').click(function() {...});
    On click: Single whois lookup/search button
 */
$(document).on('click', '#singlewhoisSearchButtonSearch', function () {
  const { input } = singleWhois;
  let { domain } = input;

  if ($(this).hasClass('is-loading')) return true;
  electron.send('app:debug', '#singlewhoisSearchButtonSearch was clicked');

  domain = $('#singlewhoisSearchInputDomain').val() as string;

  electron.send('app:debug', formatString('Looking up for {0}', domain));

  $('#singlewhoisSearchButtonSearch').addClass('is-loading');
  $('#singlewhoisSearchInputDomain').attr('readonly', '');
  $('.notification:not(.is-hidden)').addClass('is-hidden');
  $('#singlewhoisTableWhoisinfo:not(.is-hidden)').addClass('is-hidden');
  tableReset();
  void (async () => {
    try {
      const result = await electron.invoke(IpcChannel.SingleWhoisLookup, domain);
      await handleResults(result);
    } catch (e) {
      electron.send('app:error', `Lookup failed: ${e}`);
      $('#singlewhoisSearchButtonSearch').removeClass('is-loading');
      $('#singlewhoisSearchInputDomain').removeAttr('readonly');
    }
  })();
  return undefined;
});

/*
  $('.singlewhoisMessageWhoisOpen').click(function() {...});
    On click: Single whois lookup modal open click
 */
$(document).on('click', '.singlewhoisMessageWhoisOpen', function () {
  electron.send('app:debug', 'Opening whois reply');
  $('#singlewhoisMessageWhois').addClass('is-active');

  return;
});

/*
  $('#singlewhoisMessageWhoisClose').click(function() {...});
    On click: Single whois lookup modal close click
 */
$(document).on('click', '#singlewhoisMessageWhoisClose', function () {
  electron.send('app:debug', 'Closing whois reply');
  $('#singlewhoisMessageWhois').removeClass('is-active');

  return;
});

/*
  $('#singlewhoisDomainCopiedClose').click(function() {...});
    On click: Domain copied close click
 */
$(document).on('click', '#singlewhoisDomainCopiedClose', function () {
  electron.send('app:debug', 'Closing domain copied');
  $('#singlewhoisDomainCopied').removeClass('is-active');

  return;
});

/*
  tableReset
    Resets registry table contents
 */
function tableReset() {
  electron.send('app:debug', 'Resetting whois result table');
  $('#singlewhoisTdDomain').attr('href', '#');
  $('#singlewhoisTdDomain').text('n/a');
  $('#singlewhoisTdUpdate').text('n/a');
  $('#singlewhoisTdRegistrar').text('n/a');
  $('#singlewhoisTdCreation').text('n/a');
  $('#singlewhoisTdCompany').text('n/a');
  $('#singlewhoisTdExpiry').text('n/a');

  return;
}

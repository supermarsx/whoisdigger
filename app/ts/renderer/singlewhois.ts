import { isDomainAvailable, getDomainParameters, WhoisResult } from '../common/availability';
import { preStringStrip, toJSON } from '../common/parser';

import { getDate } from '../common/conversions';
import { ipcRenderer } from 'electron';
import { formatString } from '../common/stringformat';

import $ from 'jquery';
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
  ipcRenderer.on('singlewhois:results', function(...) {...});
    On event: Single whois results, whois reply processing
  parameters
    event (object) - Event object
    domainResults (object) - Domain results object
 */
ipcRenderer.on('singlewhois:results', function (event, domainResults: string) {
  let domainName: string;
  let domainStatus: string;
  let domainResultsJSON: Record<string, unknown>;
  let resultFilter: WhoisResult;
  let errorReason: string | undefined;
  //ipcRenderer.send('app:debug', "Whois domain reply:\n {0}".format(domainResults));

  domainResults = preStringStrip(domainResults);
  domainResultsJSON = toJSON(domainResults) as Record<string, unknown>;

  // Check domain status
  domainName =
    (domainResultsJSON.domainName as string | undefined) ||
    (domainResultsJSON.domain as string | undefined) ||
    '';

  domainStatus = isDomainAvailable(domainResults);
  resultFilter = getDomainParameters(domainName, domainStatus, domainResults, domainResultsJSON);

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

  return;
});

/*
  ipcRenderer.on('singlewhois:copied', function() {...});
    On event: Domain copied
 */
ipcRenderer.on('singlewhois:copied', function () {
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
  ipcRenderer.send('singlewhois:openlink', domain);

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
  ipcRenderer.send('app:debug', '#singlewhoisSearchButtonSearch was clicked');

  domain = $('#singlewhoisSearchInputDomain').val() as string;

  ipcRenderer.send('app:debug', formatString('Looking up for {0}', domain));

  $('#singlewhoisSearchButtonSearch').addClass('is-loading');
  $('#singlewhoisSearchInputDomain').attr('readonly', '');
  $('.notification:not(.is-hidden)').addClass('is-hidden');
  $('#singlewhoisTableWhoisinfo:not(.is-hidden)').addClass('is-hidden');
  tableReset();
  ipcRenderer.send('singlewhois:lookup', domain);
  return undefined;
});

/*
  $('.singlewhoisMessageWhoisOpen').click(function() {...});
    On click: Single whois lookup modal open click
 */
$(document).on('click', '.singlewhoisMessageWhoisOpen', function () {
  ipcRenderer.send('app:debug', 'Opening whois reply');
  $('#singlewhoisMessageWhois').addClass('is-active');

  return;
});

/*
  $('#singlewhoisMessageWhoisClose').click(function() {...});
    On click: Single whois lookup modal close click
 */
$(document).on('click', '#singlewhoisMessageWhoisClose', function () {
  ipcRenderer.send('app:debug', 'Closing whois reply');
  $('#singlewhoisMessageWhois').removeClass('is-active');

  return;
});

/*
  $('#singlewhoisDomainCopiedClose').click(function() {...});
    On click: Domain copied close click
 */
$(document).on('click', '#singlewhoisDomainCopiedClose', function () {
  ipcRenderer.send('app:debug', 'Closing domain copied');
  $('#singlewhoisDomainCopied').removeClass('is-active');

  return;
});

/*
  tableReset
    Resets registry table contents
 */
function tableReset() {
  ipcRenderer.send('app:debug', 'Resetting whois result table');
  $('#singlewhoisTdDomain').attr('href', '#');
  $('#singlewhoisTdDomain').text('n/a');
  $('#singlewhoisTdUpdate').text('n/a');
  $('#singlewhoisTdRegistrar').text('n/a');
  $('#singlewhoisTdCreation').text('n/a');
  $('#singlewhoisTdCompany').text('n/a');
  $('#singlewhoisTdExpiry').text('n/a');

  return;
}

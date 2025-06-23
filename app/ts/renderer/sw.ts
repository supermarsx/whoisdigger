
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
  ipcRenderer.on('sw:results', function(...) {...});
    On event: Single whois results, whois reply processing
  parameters
    event (object) - Event object
    domainResults (object) - Domain results object
 */
ipcRenderer.on('sw:results', function(event, domainResults: string) {
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

  const {
    domain,
    updateDate,
    registrar,
    creationDate,
    company,
    expiryDate
  } = resultFilter;

  switch (domainStatus) {
    case 'unavailable':
      $('#swMessageUnavailable').removeClass('is-hidden');
      $('#swMessageWhoisResults').text(domainResults);

      $('#swTdDomain').attr('url', "http://" + (domain ?? ''));
      $('#swTdDomain').text(domain ?? '');

      $('#swTdUpdate').text(updateDate ?? '');
      $('#swTdRegistrar').text(registrar ?? '');
      $('#swTdCreation').text(creationDate ?? '');
      $('#swTdCompany').text(company ?? '');
      $('#swTdExpiry').text(expiryDate ?? '');
      $('#swTableWhoisinfo.is-hidden').removeClass('is-hidden');
      break;

    case 'available':
      $('#swMessageWhoisResults').text(domainResults);
      $('#swMessageAvailable').removeClass('is-hidden');
      break;

    default:
      if (domainStatus.includes('error')) {
        errorReason = domainStatus.split(':')[1]; // Get Error reason
        $('#swMessageWhoisResults').text(formatString('Whois error due to {0}:\n{1}', errorReason, domainResults));
        $('#swMessageError').removeClass('is-hidden');
      } else {
        $('#swMessageWhoisResults').text(formatString('Whois default error\n{0}', domainResults));
        $('#swMessageError').removeClass('is-hidden');
      }
      break;
  }

  $('#swSearchButtonSearch').removeClass('is-loading');
  $('#swSearchInputDomain').removeAttr('readonly');

  return;
});

/*
  ipcRenderer.on('sw:copied', function() {...});
    On event: Domain copied
 */
ipcRenderer.on('sw:copied', function() {
  $('#swDomainCopied').addClass('is-active');

  return;
});

/*
  $('#swSearchInputDomain').keyup(function(...) {...});
    On keyup: Trigger search event with [ENTER] key
 */
$('#swSearchInputDomain').keyup(function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) $('#swSearchButtonSearch').click();

  return;
});

/*
  $('#swTdDomain').click(function() {...});
    On click: Open website for domain lookup URL in a new window
 */
$(document).on('click', '#swTdDomain', function() {
  const domain = $('#swTdDomain').attr('url') as string;
  ipcRenderer.send('sw:openlink', domain);

  return;
});

/*
  $('#swSearchButtonSearch').click(function() {...});
    On click: Single whois lookup/search button
 */
$(document).on('click', '#swSearchButtonSearch', function() {
  const { input } = singleWhois;
  let { domain } = input;

  if ($(this).hasClass('is-loading')) return true;
  ipcRenderer.send('app:debug', "#swSearchButtonSearch was clicked");

  domain = $('#swSearchInputDomain').val() as string;

ipcRenderer.send('app:debug', formatString('Looking up for {0}', domain));

  $('#swSearchButtonSearch').addClass('is-loading');
  $('#swSearchInputDomain').attr('readonly', '');
  $('.notification:not(.is-hidden)').addClass('is-hidden');
  $('#swTableWhoisinfo:not(.is-hidden)').addClass('is-hidden');
  tableReset();
  ipcRenderer.send("sw:lookup", domain);
  return undefined;
});

/*
  $('.swMessageWhoisOpen').click(function() {...});
    On click: Single whois lookup modal open click
 */
$(document).on('click', '.swMessageWhoisOpen', function() {
  ipcRenderer.send('app:debug', "Opening whois reply");
  $('#swMessageWhois').addClass('is-active');

  return;
});

/*
  $('#swMessageWhoisClose').click(function() {...});
    On click: Single whois lookup modal close click
 */
$(document).on('click', '#swMessageWhoisClose', function() {
  ipcRenderer.send('app:debug', "Closing whois reply");
  $('#swMessageWhois').removeClass('is-active');

  return;
});

/*
  $('#swDomainCopiedClose').click(function() {...});
    On click: Domain copied close click
 */
$(document).on('click', '#swDomainCopiedClose', function() {
  ipcRenderer.send('app:debug', "Closing domain copied");
  $('#swDomainCopied').removeClass('is-active');

  return;
});

/*
  tableReset
    Resets registry table contents
 */
function tableReset() {
  ipcRenderer.send('app:debug', "Resetting whois result table");
  $('#swTdDomain').attr('href', "#");
  $('#swTdDomain').text('n/a');
  $('#swTdUpdate').text('n/a');
  $('#swTdRegistrar').text('n/a');
  $('#swTdCreation').text('n/a');
  $('#swTdCompany').text('n/a');
  $('#swTdExpiry').text('n/a');

  return;
}

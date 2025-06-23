// jshint esversion: 8, -W069

const whois = require('../common/whoiswrapper'),
  parseRawData = require('../common/parseRawData');

const {
  getDate
} = require('../common/conversions'), {
  ipcRenderer
} = require('electron');

const {
  isDomainAvailable,
  getDomainParameters,
  preStringStrip,
  toJSON
} = whois;

(window as any).$ = (window as any).jQuery = require('jquery');

var singleWhois = {
  'input': {
    'domain': null
  },
  'results': null
};

/*
  ipcRenderer.on('sw:results', function(...) {...});
    On event: Single whois results, whois reply processing
  parameters
    event (object) - Event object
    domainResults (object) - Domain results object
 */
ipcRenderer.on('sw:results', function(event, domainResults) {
  var domainName,
    domainStatus,
    domainResultsJSON,
    resultFilter,
    errorReason;
  //ipcRenderer.send('app:debug', "Whois domain reply:\n {0}".format(domainResults));

  domainResults = preStringStrip(domainResults);
  domainResultsJSON = toJSON(domainResults);

  // Check domain status
  domainName = domainResultsJSON.domainName || domainResultsJSON.domain;

  domainStatus = isDomainAvailable(domainResults);
  resultFilter = getDomainParameters(domainName, domainStatus, domainResults, domainResultsJSON);

  var {
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

      $('#swTdDomain').attr('url', "http://" + domain);
      $('#swTdDomain').text(domain);

      //console.log(domainResultsJSON['registrarRegistrationExpirationDate'] || domainResultsJSON['expires'] || domainResultsJSON['registryExpiryDate']);
      $('#swTdUpdate').text(updateDate);
      $('#swTdRegistrar').text(registrar);
      $('#swTdCreation').text(creationDate);
      $('#swTdCompany').text(company);
      $('#swTdExpiry').text(expiryDate);
      $('#swTableWhoisinfo.is-hidden').removeClass('is-hidden');
      break;

    case 'available':
      $('#swMessageWhoisResults').text(domainResults);
      $('#swMessageAvailable').removeClass('is-hidden');
      break;

    default:
      if (domainStatus.includes('error')) {
        errorReason = domainStatus.split(':')[1]; // Get Error reason
        $('#swMessageWhoisResults').text("Whois error due to {0}:\n{1}".format(errorReason, domainResults));
        $('#swMessageError').removeClass('is-hidden');
      } else {
        $('#swMessageWhoisResults').text("Whois default error\n{0}".format(domainResults));
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
  var domain = $('#swTdDomain').attr('url');
  ipcRenderer.send('sw:openlink', domain);

  return;
});

/*
  $('#swSearchButtonSearch').click(function() {...});
    On click: Single whois lookup/search button
 */
$(document).on('click', '#swSearchButtonSearch', function() {
  var {
    input
  } = singleWhois;
  var {
    domain
  } = input;

  if ($(this).hasClass('is-loading')) return true;
  ipcRenderer.send('app:debug', "#swSearchButtonSearch was clicked");

  domain = $('#swSearchInputDomain').val();

  ipcRenderer.send('app:debug', "Looking up for {0}".format(domain));

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

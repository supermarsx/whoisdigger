var whois = require('../common/whoiswrapper.js'),
  parseRawData = require('../common/parse-raw-data.js');

var { getDate } = require('../common/conversions.js');
window.$ = window.jQuery = require('jquery');

const {
  ipcRenderer
} = require('electron');

var singleWhois = {
  'input': {
    'domain': null
  },
  'results': null
}

// Single Whois, whois reply processing
ipcRenderer.on('sw:results', function(event, domainResults) {
  const {
    isDomainAvailable,
    getDomainParameters
  } = whois;
  var domainName,
    domainStatus,
    domainResultsJSON,
    resultFilter,
    errorReason;
  //ipcRenderer.send('app:debug', "Whois domain reply:\n {0}".format(domainResults));

  domainResults = whois.preStringStrip(domainResults);
  domainResultsJSON = (function() {
    var result;
    if (typeof domainResults === 'object') {
      JSON.stringify(domainResults, null, 2);
      result = domainResults.map(function(data) {
        data.data = parseRawData(data.data);
        return data;
      });
    } else {
      result = parseRawData(domainResults);
    }
    return result;
  })();

  // Check domain status
  domainName = domainResultsJSON['domainName'] || domainResultsJSON['domain']
  domainStatus = isDomainAvailable(domainResults);
  resultFilter = getDomainParameters(domainName, domainStatus, domainResults, domainResultsJSON);

  switch (domainStatus) {
    case 'unavailable':
      $('#swMessageUnavailable').removeClass('is-hidden');
      $('#swMessageWhoisResults').text(domainResults);

      $('#swTdDomain').attr('url', "http://" + resultFilter.domain);
      $('#swTdDomain').text(resultFilter.domain);

      //console.log(domainResultsJSON['registrarRegistrationExpirationDate'] || domainResultsJSON['expires'] || domainResultsJSON['registryExpiryDate']);
      $('#swTdUpdate').text(resultFilter.updatedate);
      $('#swTdRegistrar').text(resultFilter.registrar);
      $('#swTdCreation').text(resultFilter.creationdate);
      $('#swTdCompany').text(resultFilter.company);
      $('#swTdExpiry').text(resultFilter.expirydate);
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

});

// Simple Whois, trigger search by using [ENTER] key
$('#swSearchInputDomain').keyup(function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#swSearchButtonSearch').click();
  }
});

// Open URL in new Window
$('#swTdDomain').click(function() {
  var domain = $('#swTdDomain').attr('url');
  ipcRenderer.send('sw:openlink', domain);
});

// Trigger Whois lookup
$('#swSearchButtonSearch').click(function() {
  if ($(this).hasClass('is-loading')) {
    return true;
  }
  ipcRenderer.send('app:debug', "#swSearchButtonSearch was clicked");

  singleWhois.input.domain = $('#swSearchInputDomain').val();

  ipcRenderer.send('app:debug', "Looking up for {0}".format(singleWhois.input.domain));

  $('#swSearchButtonSearch').addClass('is-loading');
  $('#swSearchInputDomain').attr('readonly', '');
  $('.notification:not(.is-hidden)').addClass('is-hidden');
  $('#swTableWhoisinfo:not(.is-hidden)').addClass('is-hidden');
  tableReset();
  ipcRenderer.send("sw:lookup", singleWhois.input.domain);
  return undefined;
});

// Open simple whois model
$('.swMessageWhoisOpen').click(function() {
  ipcRenderer.send('app:debug', "Opening whois reply");
  $('#swMessageWhois').addClass('is-active');
});

// Close simple whois modal
$('#swMessageWhoisClose').click(function() {
  ipcRenderer.send('app:debug', "Closing whois reply");
  $('#swMessageWhois').removeClass('is-active');
});



// Reset registry table contents
function tableReset() {
  ipcRenderer.send('app:debug', "Resetting whois result table");
  $('#swTdDomain').attr('href', "#");
  $('#swTdDomain').text('n/a');

  $('#swTdUpdate').text('n/a');
  $('#swTdRegistrar').text('n/a');
  $('#swTdCreation').text('n/a');
  $('#swTdCompany').text('n/a');
  $('#swTdExpiry').text('n/a');
}

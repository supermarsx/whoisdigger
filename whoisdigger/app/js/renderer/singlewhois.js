var whois = require('../common/whoiswrapper.js');

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
ipcRenderer.on('singlewhois:results', function(event, domainResults) {

  //ipcRenderer.send('app:debug', "Whois domain reply:\n {0}".format(domainResults));

  var domainResultsJSON = (function() {
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
  });

  // Check domain status
  domainStatus = whois.isDomainAvailable(domainResults);

  switch (domainStatus) {
    case 'querylimituniregistry':
    case 'error':
      $('#swMessageWhoisResults').text("Whois error: {0}\n{1}".format(domainStatus, domainResults));
      $('#swMessageError').removeClass('is-hidden');
      break;
    case 'unavailable':
      $('#swMessageUnavailable').removeClass('is-hidden');
      $('#swMessageWhoisResults').text(domainResults);

      $('#swTableDomain').attr('href', "http://" + domainResultsJSON['domainName']);
      $('#swTableDomain').text(domainResultsJSON['domainName']);

      $('#swTableUpdate').text(domainResultsJSON['updatedDate']);
      $('#swTableRegistrar').text(domainResultsJSON['registrar']);
      $('#swTableCreation').text(domainResultsJSON['creationDate']);
      $('#swTableCompany').text(domainResultsJSON['registrantOrganization']);
      $('#swTableExpiry').text(domainResultsJSON['registrarRegistrationExpirationDate']);
      $('#swTableWhoisInfo.is-hidden').removeClass('is-hidden');
      break;
    case 'available':
      $('#swMessageWhoisResults').text(domainResults);
      $('#swMessageAvailable').removeClass('is-hidden');
      break;
    default:
      $('#swMessageWhoisResults').text("Whois default error\n{0}".format(domainResults));
      $('#swMessageError').removeClass('is-hidden');
      break;
  }

  $('#swButtonSearch').removeClass('is-loading');
  $('#swInputDomain').removeAttr('readonly');

});

// Simple Whois, trigger search by using [ENTER] key
document.getElementById('swInputDomain').addEventListener("keyup", function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#swButtonSearch').click();
  }
});

// Trigger Whois lookup
$('#swButtonSearch').click(function() {
  if ($(this).hasClass('is-loading')) {
    return true;
  }
  ipcRenderer.send('app:debug', "#swButtonSearch was clicked");

  singleWhois.input.domain = $('#swInputDomain').val();

  ipcRenderer.send('app:debug', "Looking up for {0}".format(singleWhois.input.domain));

  $('#swButtonSearch').addClass('is-loading');
  $('#swInputDomain').attr('readonly', '');
  $('.notification:not(.is-hidden)').addClass('is-hidden');
  $('#swTable:not(.is-hidden)').addClass('is-hidden');
  tableReset();
  ipcRenderer.send("singlewhois:lookup", singleWhois.input.domain);
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
  $('#swTableDomain').attr('href', "#");
  $('#swTableDomain').text('n/a');

  $('#swTableUpdate').text('n/a');
  $('#swTableRegistrar').text('n/a');
  $('#swTableCreation').text('n/a');
  $('#swTableCompany').text('n/a');
  $('#swTableExpiry').text('n/a');
}

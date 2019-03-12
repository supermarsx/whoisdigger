var whois = require('../../common/whoiswrapper.js'),
  conversions = require('../../common/conversions.js');

require('../../common/stringformat.js');

const {
  ipcRenderer
} = require('electron');

const base = 10;

/*
// Receive whois lookup reply
ipcRenderer.on('bulkwhois:results', function(event, domain, domainResults) {

  //ipcRenderer.send('app:debug', "Whois domain reply for {0}:\n {1}".format(domain, domainResults));


  (function() {
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

});
*/

/*
// Receive bulk whois results
ipcRenderer.on('bulkwhois:resultreceive', function(event, results) {

});
*/

// Bulk whois processing, ui status update
ipcRenderer.on('bw:status.update', function(event, stat, value) {
  ipcRenderer.send('app:debug', "{0}, value update to {1}".format(stat, value)); // status update
  var percent;
  switch (stat) {
    case 'start':
      if ($('#bwProcessingButtonNext').hasClass('is-hidden') === false) {
        $('#bwProcessingButtonNext').addClass('is-hidden');
        $('#bwProcessingButtonPause').removeClass('is-hidden');
        $('#bwProcessingButtonStop').removeClass('is-hidden');
      }
      break;
    case 'domains.processed': // processed domains
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanProcessed').text('{0} ({1}%)'.format(value, percent));
      break;
    case 'domains.waiting': // whois requests waiting reply
      percent = parseFloat((value / parseInt($('#bwProcessingSpanSent').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanWaiting').text('{0} ({1}%)'.format(value, percent));
      break;
    case 'domains.sent': // sent whois requests
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanSent').text('{0} ({1}%)'.format(value, percent));
      break;
    case 'domains.total': // total domains
      $('#bwProcessingSpanTotal').text(value);
      break;
    case 'time.current': // current time
      $('#bwProcessingSpanTimecurrent').text('{0}'.format(value));
      break;
    case 'time.remaining': // remaining time
      $('#bwProcessingSpanTimeremaining').text('{0}'.format(value));
      break;
    case 'reqtimes.maximum': // maximum request reply time
      $('#bwProcessingSpanReqtimemax').text('{0}ms'.format(value));
      break;
    case 'reqtimes.minimum': // minimum request reply time
      $('#bwProcessingSpanReqtimemin').text('{0}ms'.format(value));
      break;
    case 'reqtimes.last': // last request reply time
      $('#bwProcessingSpanReqtimelast').text('{0}ms'.format(value));
      break;
    case 'reqtimes.average': // Average request reply time
      $('#bwProcessingSpanReqtimeavg').text('{0}ms'.format(value));
      break;
    case 'status.available': // Domains available
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanStatusavailable').text('{0} ({1}%)'.format(value, percent));
      break;
    case 'status.unavailable': // Domains unavailable
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanStatusunavailable').text('{0} ({1}%)'.format(value, percent));
      break;
    case 'status.error': // Domains error
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanStatuserror').text('{0} ({1}%)'.format(value, percent));
      break;
    case 'laststatus.available': // Last available domain
      $('#bwProcessingSpanLaststatusavailable').text('{0}'.format(value));
      break;
    case 'laststatus.unavailable': // Last unavailable domain
      $('#bwProcessingSpanLaststatusunavailable').text('{0}'.format(value));
      break;
    case 'laststatus.error': // Last error domain
      $('#bwProcessingSpanLaststatuserror').text('{0}'.format(value));
      break;
    case 'finished': // Finished
      $('#bwProcessingButtonPause').addClass('is-hidden');
      $('#bwProcessingButtonStop').addClass('is-hidden');
      $('#bwProcessingButtonNext').removeClass('is-hidden');
      break;
    default:
      break;
  }
});

// Bulk processing, pause/continue process
$('#bwProcessingButtonPause').click(function() {
  var searchStatus = $('#bwProcessingButtonPauseSpanText').text();
  switch (searchStatus) {
    case 'Continue':
      setPauseButton();
      ipcRenderer.send('bw:lookup.continue');
      break;
    case 'Pause':
      $('#bwProcessingButtonPause').removeClass('is-warning').addClass('is-success');
      $('#bwProcessingButtonPauseicon').removeClass('fa-pause').addClass('fa-play');
      $('#bwProcessingButtonPauseSpanText').text('Continue');
      ipcRenderer.send('bw:lookup.pause');
      break;
    default:
      break;
  }
});

function setPauseButton() {
  $('#bwProcessingButtonPause').removeClass('is-success').addClass('is-warning');
  $('#bwProcessingButtonPauseicon').removeClass('fa-play').addClass('fa-pause');
  $('#bwProcessingButtonPauseSpanText').text('Pause');
}

// Trigger Bulk whois Stop modal
$('#bwProcessingButtonStop').click(function() {
  ipcRenderer.send('app:debug', "Pausing whois & opening stop modal");
  $('#bwProcessingButtonPause').text().includes('Pause') ? $('#bwProcessingButtonPause').click() : false;
  $('#bwProcessingModalStop').addClass('is-active');
});

// Close modal and allow continue
$('#bwProcessingModalStopButtonContinue').click(function() {
  ipcRenderer.send('app:debug', "Closing Stop modal & continue");
  $('#bwProcessingModalStop').removeClass('is-active');
});

// Stop bulk whois entirely and scrape everything
$('#bwProcessingModalStopButtonStop').click(function() {
  ipcRenderer.send('app:debug', "Closing Stop modal & going back to start");
  $('#bwpStopModal').removeClass('is-active');
  $('#bwProcessing').addClass('is-hidden');
  setPauseButton();
  $('#bwEntry').removeClass('is-hidden');
});

// Stop bulk whois entirely and save/export
$('#bwProcessingModalStopButtonStopsave').click(function() {
  ipcRenderer.send('app:debug', "Closing Stop modal & exporting");
  ipcRenderer.send('bw:lookup.stop');
  $('#bwProcessingModalStop').removeClass('is-active');
  $('#bwProcessing').addClass('is-hidden');
  setPauseButton();
  $('#bwExport').removeClass('is-hidden');
});

// Bulk processing, proceed to export options
$('#bwProcessingButtonNext').click(function() {
  $('#bwProcessing').addClass('is-hidden');
  $('#bwExport').removeClass('is-hidden');
});

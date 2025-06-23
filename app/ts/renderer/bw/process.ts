// jshint esversion: 8, -W030

const whois = require('../../common/whoiswrapper'),
  conversions = require('../../common/conversions'),
  base = 10;

const {
  ipcRenderer
} = require('electron');

const { formatString } = require('../../common/stringformat');

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

/*
  ipcRenderer.on('bw:status.update', function(...) {...});
    Bulk whois processing, ui status update
  parameters
    event
    stat
    value
 */
ipcRenderer.on('bw:status.update', function(event, stat, value) {
  ipcRenderer.send('app:debug', formatString('{0}, value update to {1}', stat, value)); // status update
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
      $('#bwProcessingSpanProcessed').text(formatString('{0} ({1}%)', value, percent));
      break;
    case 'domains.waiting': // whois requests waiting reply
      percent = parseFloat((value / parseInt($('#bwProcessingSpanSent').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanWaiting').text(formatString('{0} ({1}%)', value, percent));
      break;
    case 'domains.sent': // sent whois requests
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanSent').text(formatString('{0} ({1}%)', value, percent));
      break;
    case 'domains.total': // total domains
      $('#bwProcessingSpanTotal').text(value);
      break;
    case 'time.current': // current time
      $('#bwProcessingSpanTimecurrent').text(formatString('{0}', value));
      break;
    case 'time.remaining': // remaining time
      $('#bwProcessingSpanTimeremaining').text(formatString('{0}', value));
      break;
    case 'reqtimes.maximum': // maximum request reply time
      $('#bwProcessingSpanReqtimemax').text(formatString('{0}ms', value));
      break;
    case 'reqtimes.minimum': // minimum request reply time
      $('#bwProcessingSpanReqtimemin').text(formatString('{0}ms', value));
      break;
    case 'reqtimes.last': // last request reply time
      $('#bwProcessingSpanReqtimelast').text(formatString('{0}ms', value));
      break;
    case 'reqtimes.average': // Average request reply time
      $('#bwProcessingSpanReqtimeavg').text(formatString('{0}ms', value));
      break;
    case 'status.available': // Domains available
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanStatusavailable').text(formatString('{0} ({1}%)', value, percent));
      break;
    case 'status.unavailable': // Domains unavailable
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanStatusunavailable').text(formatString('{0} ({1}%)', value, percent));
      break;
    case 'status.error': // Domains error
      percent = parseFloat((value / parseInt($('#bwProcessingSpanTotal').text(), base) * 100).toFixed(1)) || 0;
      $('#bwProcessingSpanStatuserror').text(formatString('{0} ({1}%)', value, percent));
      break;
    case 'laststatus.available': // Last available domain
      $('#bwProcessingSpanLaststatusavailable').text(formatString('{0}', value));
      break;
    case 'laststatus.unavailable': // Last unavailable domain
      $('#bwProcessingSpanLaststatusunavailable').text(formatString('{0}', value));
      break;
    case 'laststatus.error': // Last error domain
      $('#bwProcessingSpanLaststatuserror').text(formatString('{0}', value));
      break;
    case 'finished': // Finished
      $('#bwProcessingButtonPause').addClass('is-hidden');
      $('#bwProcessingButtonStop').addClass('is-hidden');
      $('#bwProcessingButtonNext').removeClass('is-hidden');
      break;
    default:
      break;
  }

  return;
});

/*
  $('#bwProcessingButtonPause').click(function() {...});
    Bulk processing, pause/continue process
 */
$(document).on('click', '#bwProcessingButtonPause', function() {
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

  return;
});

/*
  setPauseButton
    Set bulk whois pause button
 */
function setPauseButton() {
  $('#bwProcessingButtonPause').removeClass('is-success').addClass('is-warning');
  $('#bwProcessingButtonPauseicon').removeClass('fa-play').addClass('fa-pause');
  $('#bwProcessingButtonPauseSpanText').text('Pause');

  return;
}

/*
  $('#bwProcessingButtonStop').click(function() {...});
    Trigger Bulk whois Stop modal
 */
$(document).on('click', '#bwProcessingButtonStop', function() {
  ipcRenderer.send('app:debug', "Pausing whois & opening stop modal");
  $('#bwProcessingButtonPause').text().includes('Pause') ? $('#bwProcessingButtonPause').click() : false;
  $('#bwProcessingModalStop').addClass('is-active');

  return;
});

/*
  $('#bwProcessingModalStopButtonContinue').click(function() {...});
    Close modal and allow continue
 */
$(document).on('click', '#bwProcessingModalStopButtonContinue', function() {
  ipcRenderer.send('app:debug', "Closing Stop modal & continue");
  $('#bwProcessingModalStop').removeClass('is-active');

  return;
});

/*
  $('#bwProcessingModalStopButtonStop').click(function() {...});
    Stop bulk whois entirely and scrape everything
 */
$(document).on('click', '#bwProcessingModalStopButtonStop', function() {
  ipcRenderer.send('app:debug', "Closing Stop modal & going back to start");
  $('#bwProcessingModalStop').removeClass('is-active');
  $('#bwProcessing').addClass('is-hidden');
  setPauseButton();
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwProcessingModalStopButtonStopsave').click(function() {...});
    Stop bulk whois entirely and save/export
 */
$(document).on('click', '#bwProcessingModalStopButtonStopsave', function() {
  ipcRenderer.send('app:debug', "Closing Stop modal & exporting");
  ipcRenderer.send('bw:lookup.stop');
  $('#bwProcessingModalStop').removeClass('is-active');
  $('#bwProcessing').addClass('is-hidden');
  setPauseButton();
  $('#bwExport').removeClass('is-hidden');

  return;
});

/*
  $('#bwProcessingButtonNext').click(function() {...});
    Bulk processing, proceed to export options
 */
$(document).on('click', '#bwProcessingButtonNext', function() {
  $('#bwProcessing').addClass('is-hidden');
  $('#bwExport').removeClass('is-hidden');

  return;
});

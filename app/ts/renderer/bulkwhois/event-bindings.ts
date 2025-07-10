import $ from '../../../vendor/jquery.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('bulkwhois.events');

export function bindProcessingEvents(electron: {
  send: (channel: string, ...args: any[]) => void;
}): void {
  $(document).on('click', '#bwProcessingButtonPause', function () {
    const searchStatus = $('#bwProcessingButtonPauseSpanText').text();
    switch (searchStatus) {
      case 'Continue':
        setPauseButton();
        electron.send(IpcChannel.BulkwhoisLookupContinue);
        break;
      case 'Pause':
        $('#bwProcessingButtonPause').removeClass('is-warning').addClass('is-success');
        $('#bwProcessingButtonPauseicon').removeClass('fa-pause').addClass('fa-play');
        $('#bwProcessingButtonPauseSpanText').text('Continue');
        electron.send(IpcChannel.BulkwhoisLookupPause);
        break;
      default:
        break;
    }
  });

  $(document).on('click', '#bwProcessingButtonStop', function () {
    debug('Pausing whois & opening stop modal');
    $('#bwProcessingButtonPause').text().includes('Pause')
      ? $('#bwProcessingButtonPause').trigger('click')
      : false;
    $('#bwProcessingModalStop').addClass('is-active');
  });

  $(document).on('click', '#bwProcessingModalStopButtonContinue', function () {
    debug('Closing Stop modal & continue');
    $('#bwProcessingModalStop').removeClass('is-active');
  });

  $(document).on('click', '#bwProcessingModalStopButtonStop', function () {
    debug('Closing Stop modal & going back to start');
    $('#bwProcessingModalStop').removeClass('is-active');
    $('#bwProcessing').addClass('is-hidden');
    setPauseButton();
    $('#bwEntry').removeClass('is-hidden');
  });

  $(document).on('click', '#bwProcessingModalStopButtonStopsave', function () {
    debug('Closing Stop modal & exporting');
    electron.send(IpcChannel.BulkwhoisLookupStop);
    $('#bwProcessingModalStop').removeClass('is-active');
    $('#bwProcessing').addClass('is-hidden');
    setPauseButton();
    $('#bwExport').removeClass('is-hidden');
  });

  $(document).on('click', '#bwProcessingButtonNext', function () {
    $('#bwProcessing').addClass('is-hidden');
    $('#bwExport').removeClass('is-hidden');
  });
}

function setPauseButton() {
  $('#bwProcessingButtonPause').removeClass('is-success').addClass('is-warning');
  $('#bwProcessingButtonPauseicon').removeClass('fa-play').addClass('fa-pause');
  $('#bwProcessingButtonPauseSpanText').text('Pause');
}

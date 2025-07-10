import $ from '../../../vendor/jquery.js';
import { debugFactory } from '../../common/logger.js';
import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

const debug = debugFactory('bulkwhois.status');
const base = 10;

export function registerStatusUpdates(electron: {
  on: (channel: string, listener: (...args: any[]) => void) => void;
}): void {
  electron.on(IpcChannel.BulkwhoisStatusUpdate, (_event, stat, value) => {
    debug(formatString('{0}, value update to {1}', stat, value));
    let percent;
    switch (stat) {
      case 'start':
        if ($('#bwProcessingButtonNext').hasClass('is-hidden') === false) {
          $('#bwProcessingButtonNext').addClass('is-hidden');
          $('#bwProcessingButtonPause').removeClass('is-hidden');
          $('#bwProcessingButtonStop').removeClass('is-hidden');
        }
        break;
      case 'domains.processed':
        percent =
          parseFloat(
            ((value / parseInt($('#bwProcessingSpanTotal').text(), base)) * 100).toFixed(1)
          ) || 0;
        $('#bwProcessingSpanProcessed').text(formatString('{0} ({1}%)', value, percent));
        break;
      case 'domains.waiting':
        percent =
          parseFloat(
            ((value / parseInt($('#bwProcessingSpanSent').text(), base)) * 100).toFixed(1)
          ) || 0;
        $('#bwProcessingSpanWaiting').text(formatString('{0} ({1}%)', value, percent));
        break;
      case 'domains.sent':
        percent =
          parseFloat(
            ((value / parseInt($('#bwProcessingSpanTotal').text(), base)) * 100).toFixed(1)
          ) || 0;
        $('#bwProcessingSpanSent').text(formatString('{0} ({1}%)', value, percent));
        break;
      case 'domains.total':
        $('#bwProcessingSpanTotal').text(value);
        break;
      case 'time.current':
        $('#bwProcessingSpanTimecurrent').text(formatString('{0}', value));
        break;
      case 'time.remaining':
        $('#bwProcessingSpanTimeremaining').text(formatString('{0}', value));
        break;
      case 'reqtimes.maximum':
        $('#bwProcessingSpanReqtimemax').text(
          formatString('{0}ms', typeof value === 'number' ? value.toFixed(2) : value)
        );
        break;
      case 'reqtimes.minimum':
        $('#bwProcessingSpanReqtimemin').text(
          formatString('{0}ms', typeof value === 'number' ? value.toFixed(2) : value)
        );
        break;
      case 'reqtimes.last':
        $('#bwProcessingSpanReqtimelast').text(
          formatString('{0}ms', typeof value === 'number' ? value.toFixed(2) : value)
        );
        break;
      case 'reqtimes.average':
        $('#bwProcessingSpanReqtimeavg').text(
          formatString('{0}ms', typeof value === 'number' ? value.toFixed(2) : value)
        );
        break;
      case 'status.available':
        percent =
          parseFloat(
            ((value / parseInt($('#bwProcessingSpanTotal').text(), base)) * 100).toFixed(1)
          ) || 0;
        $('#bwProcessingSpanStatusavailable').text(formatString('{0} ({1}%)', value, percent));
        break;
      case 'status.unavailable':
        percent =
          parseFloat(
            ((value / parseInt($('#bwProcessingSpanTotal').text(), base)) * 100).toFixed(1)
          ) || 0;
        $('#bwProcessingSpanStatusunavailable').text(formatString('{0} ({1}%)', value, percent));
        break;
      case 'status.error':
        percent =
          parseFloat(
            ((value / parseInt($('#bwProcessingSpanTotal').text(), base)) * 100).toFixed(1)
          ) || 0;
        $('#bwProcessingSpanStatuserror').text(formatString('{0} ({1}%)', value, percent));
        break;
      case 'laststatus.available':
        $('#bwProcessingSpanLaststatusavailable').text(formatString('{0}', value));
        break;
      case 'laststatus.unavailable':
        $('#bwProcessingSpanLaststatusunavailable').text(formatString('{0}', value));
        break;
      case 'laststatus.error':
        $('#bwProcessingSpanLaststatuserror').text(formatString('{0}', value));
        break;
      case 'finished':
        $('#bwProcessingButtonPause').addClass('is-hidden');
        $('#bwProcessingButtonStop').addClass('is-hidden');
        $('#bwProcessingButtonNext').removeClass('is-hidden');
        break;
      default:
        break;
    }
  });
}

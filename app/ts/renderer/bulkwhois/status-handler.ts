import { qs } from '../../utils/dom.js';
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
        if (!qs('#bwProcessingButtonNext')!.classList.contains('is-hidden')) {
          qs('#bwProcessingButtonNext')!.classList.add('is-hidden');
          qs('#bwProcessingButtonPause')!.classList.remove('is-hidden');
          qs('#bwProcessingButtonStop')!.classList.remove('is-hidden');
        }
        break;
      case 'domains.processed':
        percent =
          parseFloat(
            (
              (value / parseInt(qs('#bwProcessingSpanTotal')!.textContent || '0', base)) *
              100
            ).toFixed(1)
          ) || 0;
        qs('#bwProcessingSpanProcessed')!.textContent = formatString('{0} ({1}%)', value, percent);
        break;
      case 'domains.waiting':
        percent =
          parseFloat(
            (
              (value / parseInt(qs('#bwProcessingSpanSent')!.textContent || '0', base)) *
              100
            ).toFixed(1)
          ) || 0;
        qs('#bwProcessingSpanWaiting')!.textContent = formatString('{0} ({1}%)', value, percent);
        break;
      case 'domains.sent':
        percent =
          parseFloat(
            (
              (value / parseInt(qs('#bwProcessingSpanTotal')!.textContent || '0', base)) *
              100
            ).toFixed(1)
          ) || 0;
        qs('#bwProcessingSpanSent')!.textContent = formatString('{0} ({1}%)', value, percent);
        break;
      case 'domains.total':
        qs('#bwProcessingSpanTotal')!.textContent = String(value);
        break;
      case 'time.current':
        qs('#bwProcessingSpanTimecurrent')!.textContent = formatString('{0}', value);
        break;
      case 'time.remaining':
        qs('#bwProcessingSpanTimeremaining')!.textContent = formatString('{0}', value);
        break;
      case 'reqtimes.maximum':
        qs('#bwProcessingSpanReqtimemax')!.textContent = formatString(
          '{0}ms',
          typeof value === 'number' ? value.toFixed(2) : value
        );
        break;
      case 'reqtimes.minimum':
        qs('#bwProcessingSpanReqtimemin')!.textContent = formatString(
          '{0}ms',
          typeof value === 'number' ? value.toFixed(2) : value
        );
        break;
      case 'reqtimes.last':
        qs('#bwProcessingSpanReqtimelast')!.textContent = formatString(
          '{0}ms',
          typeof value === 'number' ? value.toFixed(2) : value
        );
        break;
      case 'reqtimes.average':
        qs('#bwProcessingSpanReqtimeavg')!.textContent = formatString(
          '{0}ms',
          typeof value === 'number' ? value.toFixed(2) : value
        );
        break;
      case 'status.available':
        percent =
          parseFloat(
            (
              (value / parseInt(qs('#bwProcessingSpanTotal')!.textContent || '0', base)) *
              100
            ).toFixed(1)
          ) || 0;
        qs('#bwProcessingSpanStatusavailable')!.textContent = formatString(
          '{0} ({1}%)',
          value,
          percent
        );
        break;
      case 'status.unavailable':
        percent =
          parseFloat(
            (
              (value / parseInt(qs('#bwProcessingSpanTotal')!.textContent || '0', base)) *
              100
            ).toFixed(1)
          ) || 0;
        qs('#bwProcessingSpanStatusunavailable')!.textContent = formatString(
          '{0} ({1}%)',
          value,
          percent
        );
        break;
      case 'status.error':
        percent =
          parseFloat(
            (
              (value / parseInt(qs('#bwProcessingSpanTotal')!.textContent || '0', base)) *
              100
            ).toFixed(1)
          ) || 0;
        qs('#bwProcessingSpanStatuserror')!.textContent = formatString(
          '{0} ({1}%)',
          value,
          percent
        );
        break;
      case 'laststatus.available':
        qs('#bwProcessingSpanLaststatusavailable')!.textContent = formatString('{0}', value);
        break;
      case 'laststatus.unavailable':
        qs('#bwProcessingSpanLaststatusunavailable')!.textContent = formatString('{0}', value);
        break;
      case 'laststatus.error':
        qs('#bwProcessingSpanLaststatuserror')!.textContent = formatString('{0}', value);
        break;
      case 'finished':
        qs('#bwProcessingButtonPause')!.classList.add('is-hidden');
        qs('#bwProcessingButtonStop')!.classList.add('is-hidden');
        qs('#bwProcessingButtonNext')!.classList.remove('is-hidden');
        break;
      default:
        break;
    }
  });
}

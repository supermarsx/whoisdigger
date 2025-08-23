import { qs, on } from '../../utils/dom.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('bulkwhois.events');

export function bindProcessingEvents(electron: {
  send: (channel: string, ...args: any[]) => void;
}): void {
  void on('click', '#bwProcessingButtonPause', () => {
    const searchStatus = qs('#bwProcessingButtonPauseSpanText')?.textContent ?? '';
    switch (searchStatus) {
      case 'Continue':
        setPauseButton();
        electron.send(IpcChannel.BulkwhoisLookupContinue);
        break;
      case 'Pause':
        qs('#bwProcessingButtonPause')!.classList.remove('is-warning');
        qs('#bwProcessingButtonPause')!.classList.add('is-success');
        qs('#bwProcessingButtonPauseicon')!.classList.remove('fa-pause');
        qs('#bwProcessingButtonPauseicon')!.classList.add('fa-play');
        if (qs('#bwProcessingButtonPauseSpanText'))
          qs('#bwProcessingButtonPauseSpanText')!.textContent = 'Continue';
        electron.send(IpcChannel.BulkwhoisLookupPause);
        break;
      default:
        break;
    }
  });

  void on('click', '#bwProcessingButtonStop', () => {
    debug('Pausing whois & opening stop modal');
    const btn = qs('#bwProcessingButtonPause');
    if (btn?.textContent?.includes('Pause')) {
      btn.dispatchEvent(new Event('click', { bubbles: true }));
    }
    qs('#bwProcessingModalStop')!.classList.add('is-active');
  });

  void on('click', '#bwProcessingModalStopButtonContinue', () => {
    debug('Closing Stop modal & continue');
    qs('#bwProcessingModalStop')!.classList.remove('is-active');
  });

  void on('click', '#bwProcessingModalStopButtonStop', () => {
    debug('Closing Stop modal & going back to start');
    qs('#bwProcessingModalStop')!.classList.remove('is-active');
    qs('#bwProcessing')!.classList.add('is-hidden');
    setPauseButton();
    qs('#bwEntry')!.classList.remove('is-hidden');
  });

  void on('click', '#bwProcessingModalStopButtonStopsave', () => {
    debug('Closing Stop modal & exporting');
    electron.send(IpcChannel.BulkwhoisLookupStop);
    qs('#bwProcessingModalStop')!.classList.remove('is-active');
    qs('#bwProcessing')!.classList.add('is-hidden');
    setPauseButton();
    qs('#bwExport')!.classList.remove('is-hidden');
  });

  void on('click', '#bwProcessingButtonNext', () => {
    qs('#bwProcessing')!.classList.add('is-hidden');
    qs('#bwExport')!.classList.remove('is-hidden');
  });
}

function setPauseButton() {
  const btn = qs('#bwProcessingButtonPause')!;
  btn.classList.remove('is-success');
  btn.classList.add('is-warning');
  qs('#bwProcessingButtonPauseicon')!.classList.remove('fa-play');
  qs('#bwProcessingButtonPauseicon')!.classList.add('fa-pause');
  if (qs('#bwProcessingButtonPauseSpanText'))
    qs('#bwProcessingButtonPauseSpanText')!.textContent = 'Pause';
}

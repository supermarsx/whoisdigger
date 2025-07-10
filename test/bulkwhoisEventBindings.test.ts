/** @jest-environment jsdom */
import jQuery from '../app/vendor/jquery.js';
import { bindProcessingEvents } from '../app/ts/renderer/bulkwhois/event-bindings';
import { IpcChannel } from '../app/ts/common/ipcChannels';

describe('event bindings', () => {
  test('pause button toggles state', () => {
    const sendMock = jest.fn();
    const electron = { send: sendMock } as any;
    document.body.innerHTML = `
      <button id="bwProcessingButtonPause" class="is-success">
        <i id="bwProcessingButtonPauseicon" class="fa-pause"></i>
        <span id="bwProcessingButtonPauseSpanText">Pause</span>
      </button>
    `;
    (window as any).$ = (window as any).jQuery = jQuery;

    bindProcessingEvents(electron);
    jQuery('#bwProcessingButtonPause').trigger('click');

    expect(sendMock).toHaveBeenCalledWith(IpcChannel.BulkwhoisLookupPause);
    expect(jQuery('#bwProcessingButtonPauseSpanText').text()).toBe('Continue');

    sendMock.mockClear();
    jQuery('#bwProcessingButtonPause').trigger('click');
    expect(sendMock).toHaveBeenCalledWith(IpcChannel.BulkwhoisLookupContinue);
  });
});

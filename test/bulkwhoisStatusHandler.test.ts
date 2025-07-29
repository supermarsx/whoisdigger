/** @jest-environment jsdom */
import jQuery from 'jquery';
import { registerStatusUpdates } from '../app/ts/renderer/bulkwhois/status-handler';
import { IpcChannel } from '../app/ts/common/ipcChannels';

describe('status handler', () => {
  test('start event shows processing controls', () => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const electron = {
      on: (channel: string, cb: (...args: any[]) => void) => {
        handlers[channel] = cb;
      }
    } as any;
    document.body.innerHTML = `
      <button id="bwProcessingButtonNext"></button>
      <button id="bwProcessingButtonPause" class="is-hidden"></button>
      <button id="bwProcessingButtonStop" class="is-hidden"></button>
    `;
    (window as any).$ = (window as any).jQuery = jQuery;

    registerStatusUpdates(electron);
    handlers[IpcChannel.BulkwhoisStatusUpdate]?.({}, 'start', 0);

    expect(jQuery('#bwProcessingButtonNext').hasClass('is-hidden')).toBe(true);
    expect(jQuery('#bwProcessingButtonPause').hasClass('is-hidden')).toBe(false);
    expect(jQuery('#bwProcessingButtonStop').hasClass('is-hidden')).toBe(false);
  });

  test('domains.processed updates percentage', () => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const electron = {
      on: (channel: string, cb: (...args: any[]) => void) => {
        handlers[channel] = cb;
      }
    } as any;
    document.body.innerHTML = `
      <span id="bwProcessingSpanTotal">10</span>
      <span id="bwProcessingSpanProcessed"></span>
    `;
    (window as any).$ = (window as any).jQuery = jQuery;

    registerStatusUpdates(electron);
    handlers[IpcChannel.BulkwhoisStatusUpdate]?.({}, 'domains.processed', 5);

    expect(jQuery('#bwProcessingSpanProcessed').text()).toBe('5 (50%)');
  });
});

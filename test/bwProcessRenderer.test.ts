/** @jest-environment jsdom */

import jQuery from 'jquery';

const handlers: Record<string, (...args: any[]) => void> = {};

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <span id="bwProcessingSpanProcessed"></span>
    <span id="bwProcessingSpanWaiting"></span>
    <span id="bwProcessingSpanSent"></span>
    <span id="bwProcessingSpanTotal"></span>
  `;
  (window as any).$ = (window as any).jQuery = jQuery;
  (window as any).electron = {
    send: jest.fn(),
    invoke: jest.fn(),
    on: (channel: string, cb: (...args: any[]) => void) => {
      handlers[channel] = cb;
    }
  };
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
  for (const key of Object.keys(handlers)) delete handlers[key];
});

function loadModule(): void {
  require('../app/ts/renderer/bw/process');
  jQuery.ready();
}

function emitStatus(stat: string, value: any): void {
  handlers['bw:status.update']?.({}, stat, value);
}

test('updates processing counters from status events', () => {
  loadModule();

  emitStatus('domains.total', 20);
  expect(jQuery('#bwProcessingSpanTotal').text()).toBe('20');

  emitStatus('domains.sent', 10);
  expect(jQuery('#bwProcessingSpanSent').text()).toBe('10 (50%)');

  emitStatus('domains.waiting', 2);
  expect(jQuery('#bwProcessingSpanWaiting').text()).toBe('2 (20%)');

  emitStatus('domains.processed', 5);
  expect(jQuery('#bwProcessingSpanProcessed').text()).toBe('5 (25%)');
});

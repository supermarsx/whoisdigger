/** @jest-environment jsdom */
import jQuery from 'jquery';

const listenHandlers: Record<string, Function> = {};

jest.mock('../app/ts/common/bridge/core.js', () => ({
  listen: jest.fn((event: string, cb: Function) => {
    listenHandlers[event] = cb;
  }),
}));

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

import { registerStatusUpdates } from '../app/ts/renderer/bulkwhois/status-handler';

describe('status handler', () => {
  beforeEach(() => {
    Object.keys(listenHandlers).forEach((k) => delete listenHandlers[k]);
  });

  test('bulk:status event updates sent and total', () => {
    document.body.innerHTML = `
      <span id="bwProcessingSpanTotal">10</span>
      <span id="bwProcessingSpanSent"></span>
    `;
    (window as any).$ = (window as any).jQuery = jQuery;

    registerStatusUpdates();
    expect(listenHandlers['bulk:status']).toBeDefined();

    listenHandlers['bulk:status']({ sent: 5, total: 10 });

    expect(jQuery('#bwProcessingSpanTotal').text()).toBe('10');
    expect(jQuery('#bwProcessingSpanSent').text()).toBe('5 (50%)');
  });
});

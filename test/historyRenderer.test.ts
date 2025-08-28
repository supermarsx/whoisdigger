/** @jest-environment jsdom */

import jQuery from 'jquery';

let mockInvoke: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <table id="historyTable"><tbody></tbody></table>
    <div id="historyEmpty" class="is-hidden"></div>
  `;
  mockInvoke = jest.fn();
  (window as any).electron = { invoke: mockInvoke };
  (window as any).$ = (window as any).jQuery = jQuery;
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
});

test('loadHistory displays entries in table', async () => {
  mockInvoke.mockResolvedValue([
    { domain: 'a.com', status: 'ok', timestamp: 1 },
    { domain: 'b.com', status: 'error', timestamp: 2 }
  ]);
  const { _test } = require('../app/ts/renderer/history');
  await _test.loadHistory();
  await Promise.resolve();
  expect(mockInvoke).toHaveBeenCalledWith('history:get');
  expect(jQuery('#historyEmpty').hasClass('is-hidden')).toBe(true);
  expect(jQuery('#historyTable tbody tr').length).toBe(2);
});

test('loadHistory shows empty message when no entries', async () => {
  mockInvoke.mockResolvedValue([]);
  const { _test } = require('../app/ts/renderer/history');
  await _test.loadHistory();
  await Promise.resolve();
  expect(jQuery('#historyEmpty').hasClass('is-hidden')).toBe(false);
  expect(jQuery('#historyTable tbody tr').length).toBe(0);
});

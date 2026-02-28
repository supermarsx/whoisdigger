/** @jest-environment jsdom */

import jQuery from 'jquery';

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/tauriBridge.js', () => ({
  historyGet: jest.fn(),
  historyClear: jest.fn(),
  monitorStart: jest.fn(),
  monitorStop: jest.fn(),
  listen: jest.fn(),
}));

import { historyGet } from '../app/ts/common/tauriBridge.js';

const mockHistoryGet = historyGet as jest.Mock;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <table id="historyTable"><tbody></tbody></table>
    <div id="historyEmpty" class="is-hidden"></div>
  `;
  mockHistoryGet.mockReset();
  (window as any).$ = (window as any).jQuery = jQuery;
});

afterEach(() => {
  delete (window as any).$;
  delete (window as any).jQuery;
});

test('loadHistory displays entries in table', async () => {
  mockHistoryGet.mockResolvedValue([
    { domain: 'a.com', status: 'ok', timestamp: 1 },
    { domain: 'b.com', status: 'error', timestamp: 2 }
  ]);
  const { _test } = require('../app/ts/renderer/history');
  await _test.loadHistory();
  await Promise.resolve();
  expect(mockHistoryGet).toHaveBeenCalled();
  expect(jQuery('#historyEmpty').hasClass('is-hidden')).toBe(true);
  expect(jQuery('#historyTable tbody tr').length).toBe(2);
});

test('loadHistory shows empty message when no entries', async () => {
  mockHistoryGet.mockResolvedValue([]);
  const { _test } = require('../app/ts/renderer/history');
  await _test.loadHistory();
  await Promise.resolve();
  expect(jQuery('#historyEmpty').hasClass('is-hidden')).toBe(false);
  expect(jQuery('#historyTable tbody tr').length).toBe(0);
});

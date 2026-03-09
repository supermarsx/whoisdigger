/** @jest-environment jsdom */

import jQuery from 'jquery';

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

const mockHistoryGetFiltered = jest.fn();

jest.mock('../app/ts/common/bridge/history.js', () => ({
  historyGetFiltered: mockHistoryGetFiltered,
  historyClear: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/monitor.js', () => ({
  monitorStart: jest.fn(),
  monitorStop: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/core.js', () => ({
  listen: jest.fn(),
}));

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <table id="historyTable"><tbody></tbody></table>
    <div id="historyEmpty" class="is-hidden"></div>
  `;
  mockHistoryGetFiltered.mockReset();
  (window as any).$ = (window as any).jQuery = jQuery;
});

afterEach(() => {
  delete (window as any).$;
  delete (window as any).jQuery;
});

test('loadHistory displays entries in table', async () => {
  mockHistoryGetFiltered.mockResolvedValue({
    entries: [
      { domain: 'a.com', status: 'ok', timestamp: 1 },
      { domain: 'b.com', status: 'error', timestamp: 2 }
    ],
    total: 2,
    page: 0,
    pageSize: 50,
  });
  const { _test } = require('../app/ts/renderer/features/history');
  await _test.loadHistory();
  await Promise.resolve();
  expect(mockHistoryGetFiltered).toHaveBeenCalled();
  expect(jQuery('#historyEmpty').hasClass('is-hidden')).toBe(true);
  expect(jQuery('#historyTable tbody tr').length).toBe(2);
});

test('loadHistory shows empty message when no entries', async () => {
  mockHistoryGetFiltered.mockResolvedValue({
    entries: [],
    total: 0,
    page: 0,
    pageSize: 50,
  });
  const { _test } = require('../app/ts/renderer/features/history');
  await _test.loadHistory();
  await Promise.resolve();
  expect(jQuery('#historyEmpty').hasClass('is-hidden')).toBe(false);
  expect(jQuery('#historyTable tbody tr').length).toBe(0);
});

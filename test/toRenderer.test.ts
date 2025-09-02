/** @jest-environment jsdom */

import jQuery from 'jquery';
import type { ProcessOptions } from '../app/ts/common/tools';

const handlers: Record<string, (...args: unknown[]) => void> = {};
const mockSend = jest.fn();
const mockInvoke = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    send: (...args: any[]) => mockSend(...args),
    invoke: (...args: any[]) => mockInvoke(...args),
    on: (channel: string, cb: (...args: any[]) => void) => {
      handlers[channel] = cb;
    }
  }
}));

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <button id="toButtonSelect"></button>
    <button id="toButtonProcess"></button>
    <span id="toFileSelected"></span>
    <input id="toPrefix" />
    <input id="toSuffix" />
    <input id="toTrimSpaces" type="checkbox" />
    <input id="toDeleteBlank" type="checkbox" />
    <input id="toDedupe" type="checkbox" />
    <input type="radio" name="toSort" value="asc" id="radioAsc" />
    <input type="radio" name="toSort" value="desc" id="radioDesc" />
    <input type="radio" name="toSort" value="random" id="radioRandom" />
    <div id="toOutput"></div>
  `;
  (window as any).$ = (window as any).jQuery = jQuery;
  (window as any).electron = {
    send: (...args: any[]) => mockSend(...args),
    invoke: (...args: any[]) => mockInvoke(...args),
    on: (channel: string, cb: (...args: any[]) => void) => {
      handlers[channel] = cb;
    }
  };
  mockSend.mockClear();
  mockInvoke.mockReset();
  require('../app/ts/renderer/to');
  jQuery.ready();
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
  for (const key in handlers) delete handlers[key];
});

test('process with no additional options', async () => {
  mockInvoke.mockResolvedValueOnce('/tmp/list.txt');
  jQuery('#toButtonSelect').trigger('click');
  await new Promise((r) => setTimeout(r, 0));

  mockInvoke.mockResolvedValueOnce('ok');
  jQuery('#toButtonProcess').trigger('click');
  await new Promise((r) => setTimeout(r, 0));

  const expected: ProcessOptions = {};
  expect(mockInvoke).toHaveBeenLastCalledWith('to:process', '/tmp/list.txt', expected);
  expect(jQuery('#toOutput').text()).toBe('ok');
});

test.each(['asc', 'desc', 'random'] as const)('select and process file flow (%s)', async (sort) => {
  mockInvoke.mockResolvedValueOnce('/tmp/list.txt');
  jQuery('#toButtonSelect').trigger('click');
  await new Promise((r) => setTimeout(r, 0));
  expect(mockInvoke).toHaveBeenCalledWith('to:input.file');

  jQuery('#toPrefix').val('pre');
  jQuery('#toSuffix').val('suf');
  jQuery('#toTrimSpaces').prop('checked', true);
  jQuery('#toDeleteBlank').prop('checked', true);
  jQuery('#toDedupe').prop('checked', true);
  jQuery(`#radio${sort[0].toUpperCase()}${sort.slice(1)}`).prop('checked', true);

  mockInvoke.mockResolvedValueOnce('ok');
  jQuery('#toButtonProcess').trigger('click');
  await new Promise((r) => setTimeout(r, 0));

  const expected: ProcessOptions = {
    prefix: 'pre',
    suffix: 'suf',
    trimSpaces: true,
    deleteBlankLines: true,
    dedupe: true,
    sort
  };
  expect(mockInvoke).toHaveBeenLastCalledWith('to:process', '/tmp/list.txt', expected);
  expect(jQuery('#toOutput').text()).toBe('ok');
});

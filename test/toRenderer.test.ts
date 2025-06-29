/** @jest-environment jsdom */

import jQuery from 'jquery';

const handlers: Record<string, (...args: any[]) => void> = {};
const sendMock = jest.fn();
const invokeMock = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    send: (...args: any[]) => sendMock(...args),
    invoke: (...args: any[]) => invokeMock(...args),
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
    <div id="toOutput"></div>
  `;
  (window as any).$ = (window as any).jQuery = jQuery;
  sendMock.mockClear();
  invokeMock.mockReset();
  require('../app/ts/renderer/to');
  jQuery.ready();
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
  for (const key in handlers) delete handlers[key];
});

test('select and process file flow', async () => {
  jQuery('#toButtonSelect').trigger('click');
  expect(sendMock).toHaveBeenCalledWith('to:input.file');

  handlers['to:fileinput.confirmation']?.({}, '/tmp/list.txt');
  expect(jQuery('#toFileSelected').text()).toBe('/tmp/list.txt');

  jQuery('#toPrefix').val('pre');
  jQuery('#toSuffix').val('suf');
  jQuery('#toTrimSpaces').prop('checked', true);
  jQuery('#toDeleteBlank').prop('checked', true);
  jQuery('#toDedupe').prop('checked', true);
  jQuery('#radioAsc').prop('checked', true);

  jQuery('#toButtonProcess').trigger('click');
  await new Promise((r) => setTimeout(r, 0));

  expect(invokeMock).toHaveBeenCalledWith('to:process', '/tmp/list.txt', {
    prefix: 'pre',
    suffix: 'suf',
    trimSpaces: true,
    deleteBlankLines: true,
    dedupe: true,
    sort: 'asc'
  });

  handlers['to:process.result']?.({}, 'ok');
  expect(jQuery('#toOutput').text()).toBe('ok');
});

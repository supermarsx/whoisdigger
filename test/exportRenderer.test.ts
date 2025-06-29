/** @jest-environment jsdom */

import jQuery from '../app/vendor/jquery.js';

const handlers: Record<string, (...args: any[]) => void> = {};
let invokeMock: jest.Mock;

beforeEach(() => {
  jest.useRealTimers();
  jest.resetModules();
  document.body.innerHTML = `
    <div id="bwExport" class="">
      <select id="bwExportSelectFiletype"><option value="csv">csv</option></select>
      <select id="bwExportSelectDomains"><option value="available">available</option></select>
      <select id="bwExportSelectErrors"><option value="no">no</option></select>
      <select id="bwExportSelectInformation"><option value="domain">domain</option></select>
      <select id="bwExportSelectReply"><option value="no">no</option></select>
      <button id="bwExportButtonExport"></button>
      <button id="bwExportButtonCancel"></button>
    </div>
    <div id="bwExportloading" class="is-hidden"></div>
    <div id="bwEntry" class="is-hidden"></div>
    <div id="bwExportMessageError" class="is-hidden"><span id="bwExportErrorText"></span></div>
  `;
  (window as any).$ = (window as any).jQuery = jQuery;
  invokeMock = jest.fn().mockResolvedValue('ok');
  (window as any).electron = {
    invoke: invokeMock,
    send: jest.fn(),
    on: (channel: string, cb: (...args: any[]) => void) => {
      handlers[channel] = cb;
    }
  };
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
});

function loadModule(): void {
  require('../app/ts/renderer/bw/export');
  jQuery.ready();
}

function setResults(data: any): void {
  handlers['bw:result.receive']?.({}, data);
}

it('invokes export and shows loading', async () => {
  loadModule();
  setResults({ id: [1] });

  jQuery('#bwExportButtonExport').trigger('click');
  await new Promise((r) => setTimeout(r, 20));

  expect(invokeMock).toHaveBeenCalledWith(
    'bw:export',
    { id: [1] },
    {
      filetype: 'csv',
      domains: 'available',
      errors: 'no',
      information: 'domain',
      whoisreply: 'no'
    }
  );
  expect(jQuery('#bwExport').hasClass('is-hidden')).toBe(true);
  expect(jQuery('#bwExportloading').hasClass('is-hidden')).toBe(false);
});

it('cancel button hides export and shows entry', () => {
  loadModule();

  jQuery('#bwExportButtonCancel').trigger('click');

  expect(jQuery('#bwExport').hasClass('is-hidden')).toBe(true);
  expect(jQuery('#bwEntry').hasClass('is-hidden')).toBe(false);
  expect(invokeMock).not.toHaveBeenCalled();
});

it('displays error when export fails', async () => {
  invokeMock.mockRejectedValueOnce(new Error('fail'));
  loadModule();
  setResults({ id: [1] });

  jQuery('#bwExportButtonExport').trigger('click');
  await new Promise((r) => setTimeout(r, 20));

  expect(jQuery('#bwExportMessageError').hasClass('is-hidden')).toBe(false);
  expect(jQuery('#bwExportErrorText').text()).toBe('fail');
});

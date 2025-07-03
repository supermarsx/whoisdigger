/** @jest-environment jsdom */
import jQuery from 'jquery';
const handlers: Record<string, (...args: any[]) => void> = {};
const invokeMock = jest.fn();
const sendMock = jest.fn();
const statMock = jest.fn();
const readFileMock = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: (...args: any[]) => invokeMock(...args),
    send: (...args: any[]) => sendMock(...args),
    on: (channel: string, cb: (...args: any[]) => void) => {
      handlers[channel] = cb;
    }
  }
}));

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <button id="bwEntryButtonFile"></button>
    <div id="bwFileinputloading" class="is-hidden"></div>
    <div id="bwEntry"></div>
    <button id="bwFileButtonConfirm"></button>
    <input id="bwFileInputTlds" />
    <div id="bwFileinputconfirm"></div>
    <div id="bwProcessing" class="is-hidden"></div>
    <textarea id="bwWordlistTextareaDomains"></textarea>
    <button id="bwWordlistinputButtonConfirm"></button>
    <div id="bwWordlistinput"></div>
    <button id="bwWordlistconfirmButtonStart"></button>
    <input id="bwWordlistInputTlds" />
    <div id="bwWordlistconfirm"></div>
  `;
  (window as any).$ = (window as any).jQuery = jQuery;
  (window as any).electron = {
    invoke: invokeMock,
    send: sendMock,
    on: (channel: string, cb: (...args: any[]) => void) => {
      handlers[channel] = cb;
    },
    stat: statMock,
    readFile: readFileMock,
    path: { basename: require('path').basename },
    watch: jest.fn(async () => ({ close: jest.fn() }))
  };
  invokeMock.mockReset();
  sendMock.mockReset();
  statMock.mockResolvedValue({ size: 0, mtime: new Date(), atime: new Date() });
  readFileMock.mockResolvedValue(Buffer.from('a\nb'));
});

test('invokes bulkwhois:input.file and bulkwhois:lookup', async () => {
  jest.isolateModules(() => {
    require('../app/ts/renderer/bulkwhois/fileinput');
  });
  jQuery('#bwEntryButtonFile').trigger('click');
  await new Promise((r) => setTimeout(r, 20));
  expect(invokeMock).toHaveBeenCalledWith('bulkwhois:input.file');
  invokeMock.mockClear();
  handlers['bulkwhois:fileinput.confirmation']?.({}, '/tmp/list.txt', false);
  await new Promise((r) => setTimeout(r, 0));
  jQuery('#bwFileInputTlds').val('com');

  jQuery('#bwFileButtonConfirm').trigger('click');
  await new Promise((r) => setTimeout(r, 0));

  expect(invokeMock).toHaveBeenCalledWith('bulkwhois:lookup', ['a', 'b'], ['com']);
});

test('invokes bulkwhois:input.wordlist and lookup', async () => {
  jest.isolateModules(() => {
    require('../app/ts/renderer/bulkwhois/wordlistinput');
  });
  jQuery('#bwWordlistTextareaDomains').val('c\nd');
  jQuery('#bwWordlistInputTlds').val('net');
  jQuery('#bwWordlistinputButtonConfirm').trigger('click');
  await new Promise((r) => setTimeout(r, 0));
  expect(invokeMock).toHaveBeenCalledWith('bulkwhois:input.wordlist');
  invokeMock.mockClear();
  handlers['bulkwhois:wordlistinput.confirmation']?.();
  jQuery('#bwWordlistconfirmButtonStart').trigger('click');
  await new Promise((r) => setTimeout(r, 0));
  expect(invokeMock).toHaveBeenCalledWith('bulkwhois:lookup', ['c', 'd'], ['net']);
});

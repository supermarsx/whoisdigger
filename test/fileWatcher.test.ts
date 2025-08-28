/** @jest-environment jsdom */

jest.setTimeout(10000);

import { EventEmitter } from 'events';
import jQuery from 'jquery';
import { IpcChannel } from '../app/ts/common/ipcChannels';
import path from 'path';
jest.setTimeout(10000);
const mockIpc = new EventEmitter() as any;
mockIpc.send = jest.fn();
const watchEmitter = new EventEmitter() as any;
watchEmitter.close = jest.fn();

const statMock = jest.fn();
const readFileMock = jest.fn();
const watchMock = jest.fn(
  async (_id: string, p: string, _o: any, listener?: (...args: any[]) => void) => {
    if (listener) watchEmitter.on('change', listener);
    return { close: watchEmitter.close };
  }
);

jest.mock('electron', () => ({
  ipcRenderer: {
    on: (channel: string, listener: (...args: any[]) => void) => mockIpc.on(channel, listener),
    send: mockIpc.send
  }
}));

beforeAll(() => {
  (window as any).$ = (window as any).jQuery = jQuery;
  (window as any).electron = {
    on: (channel: string, listener: (...args: any[]) => void) => mockIpc.on(channel, listener),
    send: mockIpc.send,
    invoke: jest.fn().mockResolvedValue({ data: [], errors: [] }),
    openPath: jest.fn(),
    stat: statMock,
    bwFileRead: readFileMock,
    bwaFileRead: readFileMock,
    watch: watchMock,
    path: { basename: path.basename, join: path.join }
  };
});
beforeEach(() => {
  statMock.mockReset();
  readFileMock.mockReset();
  watchMock.mockClear();
  (watchEmitter.close as jest.Mock).mockClear();
});

test.skip('bw watcher updates table on change', async () => {
  document.body.innerHTML = `
    <div id="bwEntry"></div>
    <div id="bwFileinputloading"></div>
    <div id="bwFileinputconfirm"></div>
    <span id="bwLoadingInfo"></span>
    <span id="bwFileSpanInfo"></span>
    <td id="bwFileTdName"></td>
    <td id="bwFileTdLastmodified"></td>
    <td id="bwFileTdLastaccess"></td>
    <td id="bwFileTdFilesize"></td>
    <td id="bwFileTdFilepreview"></td>
    <span id="bwFileSpanTimebetweenmin"></span>
    <span id="bwFileSpanTimebetweenmax"></span>
    <span id="bwFileSpanTimebetweenminmax"></span>
    <td id="bwFileTdEstimate"></td>
  `;

  const initialStats = {
    size: 10,
    mtime: new Date('2020-01-01'),
    atime: new Date('2020-01-01')
  } as any;
  statMock.mockResolvedValue(initialStats);
  readFileMock.mockResolvedValue(Buffer.from('a\nb\n'));

  jest.isolateModules(() => {
    require('../app/ts/renderer/bulkwhois/fileinput');
  });

  mockIpc.emit(IpcChannel.BulkwhoisFileinputConfirmation, {}, '/tmp/test.txt', true);
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  expect(watchMock).toHaveBeenCalledWith(
    'bw',
    '/tmp/test.txt',
    { persistent: false },
    expect.any(Function)
  );

  const beforeStat = statMock.mock.calls.length;
  const beforeRead = readFileMock.mock.calls.length;

  watchEmitter.emit('change', 'change');
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  expect(statMock.mock.calls.length).toBeGreaterThan(beforeStat);
  expect(readFileMock.mock.calls.length).toBeGreaterThan(beforeRead);
});

test.skip('bwa watcher updates table on change', async () => {
  document.body.innerHTML = `
    <td id="bwaFileTdFilename"></td>
    <td id="bwaFileTdLastmodified"></td>
    <td id="bwaFileTdLastaccessed"></td>
    <td id="bwaFileTdFilesize"></td>
    <td id="bwaFileTdFilepreview"></td>
    <td id="bwaFileTdLastmodified"></td>
    <td id="bwaFileTdLastaccessed"></td>
    <td id="bwaFileTdFilesize"></td>
    <td id="bwaFileTdFilepreview"></td>
    <textarea id="bwaFileTextareaErrors"></textarea>
  `;

  const initialStats = {
    size: 5,
    mtime: new Date('2020-03-01'),
    atime: new Date('2020-03-01')
  } as any;
  statMock.mockResolvedValue(initialStats);
  readFileMock.mockResolvedValue(Buffer.from('a,b\n1,2\n3,4\n'));

  jest.isolateModules(() => {
    require('../app/ts/renderer/bwa/fileinput');
  });

  mockIpc.emit('bwa:fileinput.confirmation', {}, '/tmp/test.csv', true);
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  expect(watchMock).toHaveBeenCalledWith(
    'bwa',
    '/tmp/test.csv',
    { persistent: false },
    expect.any(Function)
  );

  const beforeStat = statMock.mock.calls.length;
  const beforeRead = readFileMock.mock.calls.length;

  watchEmitter.emit('change', 'change');
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  expect(statMock.mock.calls.length).toBeGreaterThan(beforeStat);
  expect(readFileMock.mock.calls.length).toBeGreaterThan(beforeRead);
});

test.skip('bw watcher closes on cancel', async () => {
  document.body.innerHTML = `
    <button id="bwFileButtonCancel"></button>
    <div id="bwFileinputconfirm"></div>
    <div id="bwEntry"></div>
    <span id="bwFileSpanInfo"></span>
    <div id="bwFileinputloading"></div>
    <span id="bwFileSpanTimebetweenminmax"></span>
    <span id="bwLoadingInfo"></span>
    <td id="bwFileTdName"></td>
  `;

  statMock.mockResolvedValue({ size: 1, mtime: new Date(), atime: new Date() });
  readFileMock.mockResolvedValue(Buffer.from('x'));

  jest.isolateModules(() => {
    require('../app/ts/renderer/bulkwhois/fileinput');
  });

  mockIpc.emit(IpcChannel.BulkwhoisFileinputConfirmation, {}, '/tmp/test.txt', true);
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  jQuery('#bwFileButtonCancel').trigger('click');

  expect(watchEmitter.close).toHaveBeenCalled();
});

test.skip('bwa watcher closes on cancel', async () => {
  document.body.innerHTML = `
    <button id="bwaFileinputconfirmButtonCancel"></button>
    <div id="bwaFileinputconfirm"></div>
    <div id="bwaEntry"></div>
    <span id="bwaFileSpanInfo"></span>
    <div id="bwaFileinputloading"></div>
    <td id="bwaFileTdFilename"></td>
    <td id="bwaFileTdLastmodified"></td>
    <td id="bwaFileTdLastaccessed"></td>
    <td id="bwaFileTdFilesize"></td>
    <td id="bwaFileTdFilepreview"></td>
  `;

  statMock.mockResolvedValue({ size: 1, mtime: new Date(), atime: new Date() });
  readFileMock.mockResolvedValue(Buffer.from('a,b'));

  jest.isolateModules(() => {
    require('../app/ts/renderer/bwa/fileinput');
  });

  mockIpc.emit('bwa:fileinput.confirmation', {}, '/tmp/test.csv', true);
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  jQuery('#bwaFileinputconfirmButtonCancel').trigger('click');

  expect(watchEmitter.close).toHaveBeenCalled();
});

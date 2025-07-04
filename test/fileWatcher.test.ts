/** @jest-environment jsdom */

jest.setTimeout(10000);

import { EventEmitter } from 'events';
import jQuery from 'jquery';
import { IpcChannel } from '../app/ts/common/ipcChannels';
import path from 'path';
jest.setTimeout(10000);
const ipc = new EventEmitter() as any;
ipc.send = jest.fn();
const watchEmitter = new EventEmitter() as any;
watchEmitter.close = jest.fn();

const statMock = jest.fn();
const readFileMock = jest.fn();
const watchMock = jest.fn(async (p: string, _o: any, listener?: (...args: any[]) => void) => {
  if (listener) watchEmitter.on('change', listener);
  return { close: watchEmitter.close };
});

jest.mock('electron', () => ({
  ipcRenderer: {
    on: (channel: string, listener: (...args: any[]) => void) => ipc.on(channel, listener),
    send: ipc.send
  }
}));

beforeAll(() => {
  (window as any).$ = (window as any).jQuery = jQuery;
  (window as any).electron = {
    on: (channel: string, listener: (...args: any[]) => void) => ipc.on(channel, listener),
    send: ipc.send,
    invoke: jest.fn().mockResolvedValue({ data: [], errors: [] }),
    openPath: jest.fn(),
    stat: statMock,
    readFile: readFileMock,
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

test('bw watcher updates table on change', async () => {
  document.body.innerHTML = `
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

  ipc.emit(IpcChannel.BulkwhoisFileinputConfirmation, {}, '/tmp/test.txt', true);
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  expect(watchMock).toHaveBeenCalledWith(
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

test('bwa watcher updates table on change', async () => {
  document.body.innerHTML = `
    <td id="bwaFileTdFilename"></td>
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

  ipc.emit('bwa:fileinput.confirmation', {}, '/tmp/test.csv', true);
  for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));

  expect(watchMock).toHaveBeenCalledWith(
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

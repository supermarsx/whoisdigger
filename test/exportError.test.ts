import './electronMainMock';
import fs from 'fs';
import { ipcMainHandlers, mockShowSaveDialogSync } from './electronMainMock';
jest.mock('jszip', () => {
  const generateAsync = jest.fn().mockResolvedValue('zip');
  const JSZipMock: any = jest.fn().mockImplementation(() => ({
    file: jest.fn(),
    generateAsync
  }));
  JSZipMock.support = { uint8array: false };
  return { __esModule: true, default: JSZipMock };
});

import '../app/ts/main/bulkwhois/export';
import { IpcChannel } from '../app/ts/common/ipcChannels';

describe('bw export error handling', () => {
  const results = {
    id: [1],
    domain: ['example.com'],
    status: ['available'],
    registrar: ['reg'],
    company: ['comp'],
    creationdate: ['c'],
    updatedate: ['u'],
    expirydate: ['e'],
    whoisreply: ['reply'],
    whoisjson: [{ foo: 'bar' }],
    requesttime: [1]
  };

  test('rejects when csv write fails', async () => {
    const handler = ipcMainHandlers[IpcChannel.BulkwhoisExport];
    mockShowSaveDialogSync.mockReturnValue('/tmp/out.csv');
    jest.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('fail'));

    await expect(
      handler({ sender: { send: jest.fn() } } as any, results, {
        filetype: 'csv',
        domains: 'available',
        errors: 'no',
        information: 'domain',
        whoisreply: 'no'
      })
    ).rejects.toThrow('fail');
  });

  test('rejects when zip write fails', async () => {
    const handler = ipcMainHandlers[IpcChannel.BulkwhoisExport];
    mockShowSaveDialogSync.mockReturnValue('/tmp/out');
    jest.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('zip fail'));

    await expect(
      handler({ sender: { send: jest.fn() } } as any, results, {
        filetype: 'txt',
        domains: 'available',
        errors: 'no',
        information: 'domain',
        whoisreply: 'yes+block'
      })
    ).rejects.toThrow('zip fail');
  });
});

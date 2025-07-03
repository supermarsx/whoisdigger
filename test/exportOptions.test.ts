import './electronMainMock';
import fs from 'fs';
import { ipcMainHandlers, mockShowSaveDialogSync, openPathMock } from './electronMainMock';
import { settings } from '../app/ts/main/settings-main';
import '../app/ts/main/bulkwhois/export';

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
  whoisjson: ['json'],
  requesttime: [1]
};

beforeEach(() => {
  mockShowSaveDialogSync.mockReset();
  openPathMock.mockReset();
});

test('suggests filename when enabled', async () => {
  const handler = ipcMainHandlers['bulkwhois:export'];
  settings.lookupExport.autoGenerateFilename = true;
  mockShowSaveDialogSync.mockReturnValue('/tmp/out.csv');
  await handler({ sender: { send: jest.fn() } } as any, results, {
    filetype: 'csv',
    domains: 'available',
    errors: 'no',
    information: 'domain',
    whoisreply: 'no'
  });
  const arg = mockShowSaveDialogSync.mock.calls[0][0];
  expect(arg.defaultPath).toMatch(/^bulkwhois-export-\d{14}-[0-9a-f]{6}\.csv$/);
});

test('opens exported csv when enabled', async () => {
  const handler = ipcMainHandlers['bulkwhois:export'];
  settings.lookupExport.openAfterExport = true;
  mockShowSaveDialogSync.mockReturnValue('/tmp/out.csv');
  jest.spyOn(fs.promises, 'writeFile').mockResolvedValueOnce();
  await handler({ sender: { send: jest.fn() } } as any, results, {
    filetype: 'csv',
    domains: 'available',
    errors: 'no',
    information: 'domain',
    whoisreply: 'no'
  });
  expect(openPathMock).toHaveBeenCalledWith('/tmp/out.csv');
});

test('opens exported zip when enabled', async () => {
  const handler = ipcMainHandlers['bulkwhois:export'];
  settings.lookupExport.openAfterExport = true;
  mockShowSaveDialogSync.mockReturnValue('/tmp/out.zip');
  jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
  await handler({ sender: { send: jest.fn() } } as any, results, {
    filetype: 'txt',
    domains: 'available',
    errors: 'no',
    information: 'domain',
    whoisreply: 'yes+block'
  });
  expect(openPathMock).toHaveBeenCalledWith('/tmp/out.zip');
});

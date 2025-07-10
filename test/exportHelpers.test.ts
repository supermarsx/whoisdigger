import fs from 'fs';
import JSZip from 'jszip';
import { shell } from 'electron';

jest.mock('electron', () => ({ shell: { openPath: jest.fn() } }));
import {
  buildExportIndices,
  generateContent,
  writeZipArchive,
  ExportSettings,
  ExportOptions
} from '../app/ts/main/bulkwhois/export-helpers';
import { settings } from '../app/ts/main/settings-main';

describe('export helpers', () => {
  const results = {
    id: [1, 2],
    domain: ['a.com', 'b.net'],
    status: ['available', 'unavailable'],
    registrar: ['reg1', 'reg2'],
    company: ['c1', 'c2'],
    creationdate: ['c', 'c2'],
    updatedate: ['u', 'u2'],
    expirydate: ['e', 'e2'],
    whoisreply: ['reply1', 'reply2'],
    whoisjson: [{ foo: 'bar1' }, { foo: 'bar2' }],
    requesttime: [1, 2]
  };

  const exportSettings: ExportSettings = {
    separator: settings.lookupExport.separator,
    enclosure: settings.lookupExport.enclosure,
    linebreak: settings.lookupExport.linebreak,
    filetypeText: settings.lookupExport.filetypeText,
    filetypeCsv: settings.lookupExport.filetypeCsv,
    filetypeZip: settings.lookupExport.filetypeZip,
    openAfterExport: false
  };

  test('buildExportIndices filters available', () => {
    const indices = buildExportIndices(results, {
      domains: 'available',
      errors: 'no'
    } as ExportOptions);
    expect(indices).toEqual([0]);
  });

  test('generateContent creates csv', () => {
    const opts: ExportOptions = {
      filetype: 'csv',
      domains: 'available',
      errors: 'no',
      information: 'domain',
      whoisreply: 'no'
    };
    const { content, zip } = generateContent(results, [0], opts, exportSettings);
    expect(content).toContain('a.com');
    expect(Object.keys(zip.files).length).toBe(0);
  });

  test('writeZipArchive writes zip and opens when requested', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'data');
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValueOnce();
    const open = jest.spyOn(shell, 'openPath').mockResolvedValueOnce('');
    await writeZipArchive(zip, '/tmp/out', '.zip', true);
    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
  });
});

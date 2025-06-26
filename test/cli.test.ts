import './electronMainMock';
import fs from 'fs';
import path from 'path';
import { parseArgs, lookupDomains, exportResults, CliOptions } from '../app/ts/cli';
import { lookup as whoisLookup } from '../app/ts/common/lookup';

jest.mock('../app/ts/common/lookup', () => ({ lookup: jest.fn() }));

const mockLookup = whoisLookup as jest.Mock;

describe('cli utility', () => {
  test('parseArgs extracts options', () => {
    const opts = parseArgs(['--domain', 'example.com', '--format', 'csv']);
    expect(opts.domains).toEqual(['example.com']);
    expect(opts.format).toBe('csv');
  });

  test('parseArgs recognizes cache flags', () => {
    const opts = parseArgs(['--purge-cache', '--clear-cache']);
    expect(opts.purgeCache).toBe(true);
    expect(opts.clearCache).toBe(true);
  });

  test('parseArgs detects download-model flag', () => {
    const opts = parseArgs(['--download-model']);
    expect(opts.downloadModel).toBe(true);
  });

  test('lookupDomains uses whois module', async () => {
    mockLookup.mockResolvedValueOnce('data');
    const opts: CliOptions = { domains: ['example.com'], tlds: ['com'], format: 'txt' };
    const results = await lookupDomains(opts);
    expect(results[0].domain).toBe('example.com');
    expect(results[0].whoisreply).toBe('data');
  });

  test('exportResults writes csv output', async () => {
    const file = path.join(__dirname, 'out.csv');
    const opts: CliOptions = { domains: [], tlds: ['com'], format: 'csv', out: file };
    await exportResults(
      [
        {
          domain: 'example.com',
          status: 'available',
          registrar: 'reg',
          company: 'comp',
          creationDate: 'c',
          updateDate: 'u',
          expiryDate: 'e',
          whoisreply: 'r',
          whoisJson: {}
        }
      ],
      opts
    );
    const content = await fs.promises.readFile(file, 'utf8');
    expect(content).toContain('example.com');
    fs.unlinkSync(file);
  });
});

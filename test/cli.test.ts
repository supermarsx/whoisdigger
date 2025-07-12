import fs from 'fs';
import path from 'path';
import {
  parseArgs,
  lookupDomains,
  exportResults,
  CliOptions,
  CONCURRENCY_LIMIT
} from '../app/ts/cli';
import DomainStatus from '../app/ts/common/status';
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

  test('parseArgs handles suggest option', () => {
    const opts = parseArgs(['--suggest', 'idea', '--suggest-count', '7']);
    expect(opts.suggest).toBe('idea');
    expect(opts.suggestCount).toBe(7);
  });

  test('lookupDomains uses whois module', async () => {
    mockLookup.mockResolvedValueOnce('data');
    const opts: CliOptions = { domains: ['example.com'], tlds: ['com'], format: 'txt' };
    const results = await lookupDomains(opts);
    expect(results[0].domain).toBe('example.com');
    expect(results[0].whoisreply).toBe('data');
  });

  test('lookupDomains handles lookup errors', async () => {
    mockLookup.mockRejectedValueOnce(new Error('fail'));
    const opts: CliOptions = { domains: ['bad.com'], tlds: ['com'], format: 'txt' };
    const results = await lookupDomains(opts);
    expect(results).toEqual([{ domain: 'bad.com', status: DomainStatus.Error, whoisreply: '' }]);
  });

  test('lookupDomains runs lookups concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    mockLookup.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return 'data';
    });
    const opts: CliOptions = {
      domains: ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com'],
      tlds: ['com'],
      format: 'txt'
    };
    await lookupDomains(opts);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(CONCURRENCY_LIMIT);
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

  test('parseArgs requires domain or wordlist', () => {
    expect(() => parseArgs([])).toThrow('Either --domain or --wordlist must be provided');
  });

  test('parseArgs validates suggest-count', () => {
    expect(() => parseArgs(['--suggest', 'idea', '--suggest-count', '0'])).toThrow(
      'positive integer'
    );
  });
});

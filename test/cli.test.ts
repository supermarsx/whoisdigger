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
import { settings } from '../app/ts/common/settings';
import * as dns from '../app/ts/common/dnsLookup';
import { rdapLookup } from '../app/ts/common/rdapLookup';

jest.mock('../app/ts/common/lookup', () => ({ lookup: jest.fn() }));
jest.mock('../app/ts/common/dnsLookup', () => ({
  hasNsServers: jest.fn(),
  isDomainAvailable: jest.fn()
}));
jest.mock('../app/ts/common/rdapLookup', () => ({ rdapLookup: jest.fn() }));

const mockLookup = whoisLookup as jest.Mock;
const mockDnsLookup = dns.hasNsServers as jest.Mock;
const mockDnsAvailable = dns.isDomainAvailable as jest.Mock;
const mockRdapLookup = rdapLookup as jest.Mock;

describe('cli utility', () => {
  test('parseArgs extracts options', () => {
    const opts = parseArgs(['--domain', 'example.com', '--format', 'csv']);
    expect(opts.domains).toEqual(['example.com']);
    expect(opts.format).toBe('csv');
  });

  test('parseArgs accepts json format', () => {
    const opts = parseArgs(['--domain', 'example.com', '--format', 'json']);
    expect(opts.format).toBe('json');
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

  test('parseArgs handles limit option', () => {
    const opts = parseArgs(['--domain', 'a.com', '--limit', '3']);
    expect(opts.limit).toBe(3);
  });

  test('parseArgs handles lookup-type option', () => {
    const opts = parseArgs(['--domain', 'a.com', '--lookup-type', 'dns']);
    expect(opts.lookupType).toBe('dns');
  });

  test('parseArgs detects progress flag', () => {
    const opts = parseArgs(['--domain', 'a.com', '--progress']);
    expect(opts.progress).toBe(true);
  });

  test('lookupDomains uses whois module', async () => {
    mockLookup.mockClear();
    mockDnsLookup.mockClear();
    mockRdapLookup.mockClear();
    mockLookup.mockResolvedValueOnce('data');
    const opts: CliOptions = {
      domains: ['example.com'],
      tlds: ['com'],
      format: 'txt',
      lookupType: 'whois'
    };
    const results = await lookupDomains(opts);
    expect(results[0].domain).toBe('example.com');
    expect(results[0].whoisreply).toBe('data');
    expect(mockLookup).toHaveBeenCalled();
    expect(mockDnsLookup).not.toHaveBeenCalled();
    expect(mockRdapLookup).not.toHaveBeenCalled();
  });

  test('lookupDomains uses dns module', async () => {
    mockLookup.mockClear();
    mockDnsLookup.mockClear();
    mockRdapLookup.mockClear();
    mockDnsLookup.mockResolvedValueOnce('dnsres');
    mockDnsAvailable.mockReturnValueOnce(DomainStatus.Available);
    const opts: CliOptions = {
      domains: ['example.com'],
      tlds: ['com'],
      format: 'txt',
      lookupType: 'dns'
    };
    const results = await lookupDomains(opts);
    expect(results[0].domain).toBe('example.com');
    expect(mockDnsLookup).toHaveBeenCalledWith('example.com');
    expect(mockLookup).not.toHaveBeenCalled();
    expect(mockRdapLookup).not.toHaveBeenCalled();
    expect(results[0].status).toBe(DomainStatus.Available);
  });

  test('lookupDomains uses rdap module', async () => {
    mockLookup.mockClear();
    mockDnsLookup.mockClear();
    mockRdapLookup.mockClear();
    mockRdapLookup.mockResolvedValueOnce({ statusCode: 404, body: 'not found' });
    const opts: CliOptions = {
      domains: ['example.com'],
      tlds: ['com'],
      format: 'txt',
      lookupType: 'rdap'
    };
    const results = await lookupDomains(opts);
    expect(mockRdapLookup).toHaveBeenCalledWith('example.com');
    expect(mockLookup).not.toHaveBeenCalled();
    expect(mockDnsLookup).not.toHaveBeenCalled();
    expect(results[0].status).toBe(DomainStatus.Available);
  });

  test('lookupDomains emits progress updates', async () => {
    mockLookup.mockReset();
    mockLookup.mockResolvedValue('data');
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const opts: CliOptions = {
      domains: ['a.com', 'b.com'],
      tlds: ['com'],
      format: 'txt',
      progress: true
    };
    await lookupDomains(opts);
    expect(stderrSpy.mock.calls.some((c) => c[0].toString().includes('50'))).toBe(true);
    expect(stderrSpy.mock.calls.some((c) => c[0].toString().includes('100'))).toBe(true);
    stderrSpy.mockRestore();
  });

  test('lookupDomains handles lookup errors', async () => {
    mockLookup.mockRejectedValueOnce(new Error('fail'));
    const opts: CliOptions = { domains: ['bad.com'], tlds: ['com'], format: 'txt' };
    const results = await lookupDomains(opts);
    expect(results).toEqual([{ domain: 'bad.com', status: DomainStatus.Error, whoisreply: '' }]);
  });

  test('lookupDomains resolves with empty array when no domains provided', async () => {
    mockLookup.mockClear();
    const opts: CliOptions = { domains: [], tlds: ['com'], format: 'txt' };
    const results = await lookupDomains(opts);
    expect(results).toEqual([]);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  test('lookupDomains skips lookups for empty domain list', async () => {
    mockLookup.mockClear();
    const opts: CliOptions = { domains: [], tlds: ['com'], format: 'txt' };
    const results = await lookupDomains(opts);
    expect(results).toEqual([]);
    expect(mockLookup).not.toHaveBeenCalled();
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

  test('lookupDomains reads wordlist file', async () => {
    mockLookup.mockClear();
    const wl = path.join(__dirname, 'wl.txt');
    fs.writeFileSync(wl, 'foo\nbar');
    mockLookup.mockResolvedValue('data');
    const opts: CliOptions = {
      domains: [],
      tlds: ['com'],
      wordlist: wl,
      format: 'txt'
    };
    await lookupDomains(opts);
    expect(mockLookup).toHaveBeenCalledWith('foo.com');
    expect(mockLookup).toHaveBeenCalledWith('bar.com');
    fs.unlinkSync(wl);
  });

  test('lookupDomains enforces concurrency limit with many domains', async () => {
    mockLookup.mockClear();
    let active = 0;
    let maxActive = 0;
    mockLookup.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return 'data';
    });
    const domainCount = CONCURRENCY_LIMIT * 2 + 3;
    const opts: CliOptions = {
      domains: Array.from({ length: domainCount }, (_, i) => `domain${i}.com`),
      tlds: ['com'],
      format: 'txt'
    };
    await lookupDomains(opts);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(CONCURRENCY_LIMIT);
    expect(mockLookup).toHaveBeenCalledTimes(domainCount);
  });

  test('lookupDomains respects custom limit', async () => {
    mockLookup.mockClear();
    let active = 0;
    let maxActive = 0;
    mockLookup.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return 'data';
    });
    const opts: CliOptions = {
      domains: ['a.com', 'b.com', 'c.com', 'd.com'],
      tlds: ['com'],
      format: 'txt',
      limit: 2
    };
    await lookupDomains(opts);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test('lookupDomains restores proxy settings after override', async () => {
    mockLookup.mockResolvedValueOnce('data');
    const original = {
      ...settings.lookupProxy,
      list: settings.lookupProxy.list ? [...settings.lookupProxy.list] : []
    };
    const opts: CliOptions = {
      domains: ['example.com'],
      tlds: ['com'],
      format: 'txt',
      proxy: 'http://proxy:8080'
    };
    await lookupDomains(opts);
    expect(settings.lookupProxy).toEqual(original);
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

  test('exportResults writes json output', async () => {
    const file = path.join(__dirname, 'out.json');
    const opts: CliOptions = { domains: [], tlds: ['com'], format: 'json', out: file };
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
    const data = JSON.parse(content);
    expect(data[0].domain).toBe('example.com');
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

  test('parseArgs validates limit', () => {
    expect(() => parseArgs(['--domain', 'a.com', '--limit', '0'])).toThrow('positive integer');
  });
});

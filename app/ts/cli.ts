import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import JSZip from 'jszip';
import debugModule from 'debug';
import { lookup as whoisLookup } from './common/lookup.js';
import { settings } from './common/settings.js';
import { purgeExpired, clearCache } from './common/requestCache.js';
import { isDomainAvailable, getDomainParameters, WhoisResult } from './common/availability.js';
import { toJSON } from './common/parser.js';
import { generateFilename } from './main/bw/export.js';
import { downloadModel } from './ai/modelDownloader.js';
import { suggestWords } from './ai/openaiSuggest.js';

const debug = debugModule('cli');

export interface CliOptions {
  domains: string[];
  wordlist?: string;
  tlds: string[];
  proxy?: string;
  format: 'csv' | 'txt' | 'zip';
  out?: string;
  purgeCache?: boolean;
  clearCache?: boolean;
  downloadModel?: boolean;
  suggest?: string;
  suggestCount?: number;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = yargs(argv)
    .option('domain', { type: 'string', array: true })
    .option('wordlist', { type: 'string' })
    .option('tlds', { type: 'string', array: true, default: ['com'] })
    .option('proxy', { type: 'string' })
    .option('format', { choices: ['csv', 'txt', 'zip'] as const, default: 'txt' })
    .option('out', { type: 'string' })
    .option('purge-cache', { type: 'boolean' })
    .option('clear-cache', { type: 'boolean' })
    .option('download-model', { type: 'boolean' })
    .option('suggest', { type: 'string' })
    .option('suggest-count', { type: 'number', default: 5 })
    .parseSync();
  return {
    domains: args.domain ?? [],
    wordlist: args.wordlist,
    tlds: args.tlds as string[],
    proxy: args.proxy,
    format: args.format as 'csv' | 'txt' | 'zip',
    out: args.out,
    purgeCache: args['purge-cache'],
    clearCache: args['clear-cache'],
    downloadModel: args['download-model'],
    suggest: args.suggest,
    suggestCount: args['suggest-count']
  };
}

export async function lookupDomains(opts: CliOptions): Promise<WhoisResult[]> {
  if (opts.proxy) {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.single = opts.proxy;
  }

  let domains: string[] = opts.domains;
  if (opts.wordlist) {
    const contents = await fs.promises.readFile(opts.wordlist, 'utf8');
    const words = contents.split(/\r?\n/).filter((l) => l.trim() !== '');
    const combos: string[] = [];
    for (const tld of opts.tlds) {
      combos.push(...words.map((w) => `${w}${opts.tlds.length > 0 ? '.' : ''}${tld}`));
    }
    domains = domains.concat(combos);
  }

  const results: WhoisResult[] = [];
  for (const domain of domains) {
    try {
      const data = await whoisLookup(domain);
      const json = toJSON(data) as Record<string, unknown>;
      const status = isDomainAvailable(data);
      const params = getDomainParameters(domain, status, data, json);
      results.push(params);
    } catch {
      results.push({ domain, status: 'error', whoisreply: '' });
    }
  }
  return results;
}

export async function exportResults(results: WhoisResult[], opts: CliOptions): Promise<string> {
  const { lookupExport } = settings;
  const file = opts.out ?? generateFilename(`.${opts.format}`);

  switch (opts.format) {
    case 'csv': {
      const header = [
        'Domain',
        'Status',
        'Registrar',
        'Company',
        'CreationDate',
        'UpdateDate',
        'ExpiryDate'
      ];
      const lines = results.map((r) =>
        [r.domain, r.status, r.registrar, r.company, r.creationDate, r.updateDate, r.expiryDate]
          .map(
            (v) =>
              `${lookupExport.enclosure}${(v ?? '').toString().replace(/"/g, '""')}${
                lookupExport.enclosure
              }`
          )
          .join(lookupExport.separator)
      );
      const content = [header.join(lookupExport.separator), ...lines].join(lookupExport.linebreak);
      await fs.promises.writeFile(file, content);
      return file;
    }
    case 'zip': {
      const zip = new JSZip();
      for (const r of results) {
        if (r.domain && r.whoisreply)
          zip.file(`${r.domain}${lookupExport.filetypeText}`, r.whoisreply);
      }
      const data = await zip.generateAsync({ type: 'uint8array' });
      await fs.promises.writeFile(file, data);
      return file;
    }
    default: {
      const content = results
        .map((r) => `==== ${r.domain} ====` + lookupExport.linebreak + (r.whoisreply ?? ''))
        .join(lookupExport.linebreak + lookupExport.linebreak);
      await fs.promises.writeFile(file, content);
      return file;
    }
  }
}

if (require.main === module) {
  (async () => {
    const opts = parseArgs(hideBin(process.argv));
    if (opts.suggest) {
      const words = await suggestWords(opts.suggest, opts.suggestCount ?? 5);
      for (const w of words) {
        console.info(w);
        debug(w);
      }
      return;
    }
    if (opts.downloadModel) {
      const url = settings.ai.modelURL;
      if (!url) {
        console.error('Model URL not configured');
        return;
      }
      await downloadModel(url, settings.ai.modelPath);
      console.info('Model downloaded');
      debug('Model downloaded');
      return;
    }
    if (opts.purgeCache || opts.clearCache) {
      if (opts.clearCache) {
        clearCache();
        console.info('Cache cleared');
        debug('Cache cleared');
      } else {
        const purged = purgeExpired();
        console.info(`Purged ${purged} expired entries`);
        debug(`Purged ${purged} expired entries`);
      }
      return;
    }
    const results = await lookupDomains(opts);
    const outPath = await exportResults(results, opts);
    console.info(`Results written to ${path.resolve(outPath)}`);
    debug(`Results written to ${path.resolve(outPath)}`);
  })();
}

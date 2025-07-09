import fs from 'fs';
import { shell } from 'electron';
import JSZip from 'jszip';
import { formatString } from '../../common/stringformat.js';
import type { BulkWhoisResults } from './types.js';

export interface ExportOptions {
  filetype: string;
  domains: string;
  errors: string;
  information: string;
  whoisreply: string;
}

export interface ExportSettings {
  separator: string;
  enclosure: string;
  linebreak: string;
  filetypeText: string;
  filetypeCsv: string;
  filetypeZip: string;
  openAfterExport: boolean;
}

export function buildExportIndices(
  results: BulkWhoisResults,
  options: Pick<ExportOptions, 'domains' | 'errors'>
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < results.id.length; i++) {
    const status = results.status[i];
    switch (options.domains) {
      case 'available':
        if (status === 'available') indices.push(i);
        break;
      case 'unavailable':
        if (status === 'unavailable') indices.push(i);
        break;
      case 'both':
        if (status === 'available' || status === 'unavailable') indices.push(i);
        break;
    }
  }
  for (let i = 0; i < results.id.length; i++) {
    const status = results.status[i];
    if (options.errors === 'yes' && typeof status === 'string' && status.includes('error')) {
      indices.push(i);
    }
  }
  return indices;
}

export function generateContent(
  results: BulkWhoisResults,
  indices: number[],
  options: ExportOptions,
  settings: ExportSettings
): { content?: string; zip: JSZip } {
  const {
    separator: s,
    enclosure: e,
    linebreak: l,
    filetypeText: txt,
    filetypeCsv: csv
  } = settings;
  const zip = new JSZip();
  if (options.filetype === 'txt') {
    for (const i of indices) {
      zip.file(results.domain[i] + txt, results.whoisreply[i] ?? '');
    }
    return { zip };
  }

  let header = formatString('{0}Domain{0}{1}{0}Status{0}', e, s);
  if (options.information.includes('basic')) {
    header += formatString(
      '{1}{0}Registrar{0}{1}{0}Company{0}{1}{0}Creation Date{0}{1}{0}Update Date{0}{1}{0}Expiry Date{0}',
      e,
      s
    );
  }
  if (options.information.includes('debug')) {
    header += formatString('{1}{0}ID{0}{1}{0}Request Time{0}', e, s);
  }
  if (options.whoisreply.includes('yes+inline')) {
    header += formatString('{1}{0}Whois Reply{0}', e, s);
  }

  let body = '';
  for (const i of indices) {
    body += formatString('{2}{0}{3}{0}{1}{0}{4}{0}', e, s, l, results.domain[i], results.status[i]);
    if (options.information.includes('basic')) {
      body += formatString(
        '{1}{0}{2}{0}{1}{0}{3}{0}{1}{0}{4}{0}{1}{0}{5}{0}{1}{0}{6}{0}',
        e,
        s,
        results.registrar[i],
        results.company[i],
        results.creationdate[i],
        results.updatedate[i],
        results.expirydate[i]
      );
    }
    if (options.information.includes('debug')) {
      body += formatString('{1}{0}{2}{0}{1}{0}{3}{0}', e, s, results.id[i], results.requesttime[i]);
    }
    switch (options.whoisreply) {
      case 'yes+inline':
        body += formatString('{1}{0}{2}{0}', e, s, results.whoisreply[i]);
        break;
      case 'yes+inlineseparate':
        zip.file(results.domain[i] + csv, results.whoisjson[i] ?? '');
        break;
      case 'yes+block':
        zip.file(results.domain[i] + txt, results.whoisreply[i] ?? '');
        break;
    }
  }

  return { content: header + body, zip };
}

export async function writeZipArchive(
  zip: JSZip,
  filePath: string,
  zipExt: string,
  open: boolean
): Promise<void> {
  const genType = JSZip.support.uint8array ? 'uint8array' : 'string';
  const content = await zip.generateAsync({ type: genType });
  const target = filePath.endsWith(zipExt) ? filePath : filePath + zipExt;
  await fs.promises.writeFile(target, content);
  if (open) {
    await shell.openPath(target);
  }
}

/**
 * Bridge — Bulk WHOIS operations (start, pause, stop, export).
 * @module bridge/bulk
 */

import { tauriInvoke, tauriDialog } from './_invoke.js';
import type { BulkWhoisResults } from '../bulkwhois/types.js';
import type { ExportOptions } from '../bulkwhois/export-helpers.js';

export function bulkWhoisLookup(
  domains: string[],
  tlds?: string[],
  concurrency = 4,
  timeoutMs = 5000,
): Promise<void> {
  return tauriInvoke('bulk_whois_lookup', { domains, tlds, concurrency, timeoutMs });
}

export function bulkWhoisPause(): Promise<void> {
  return tauriInvoke('bulk_whois_pause');
}

export function bulkWhoisContinue(): Promise<void> {
  return tauriInvoke('bulk_whois_continue');
}

export function bulkWhoisStop(): Promise<void> {
  return tauriInvoke('bulk_whois_stop');
}

/**
 * Bulk WHOIS lookup from a file path — avoids sending multi-MB file content
 * over IPC. Reads, trims, and splits lines server-side via rayon.
 */
export function bulkWhoisLookupFromFile(
  path: string,
  tlds?: string[],
  concurrency = 4,
  timeoutMs = 5000,
): Promise<void> {
  return tauriInvoke('bulk_whois_lookup_from_file', {
    path,
    tlds: tlds ?? null,
    concurrency,
    timeoutMs,
  });
}

export async function bulkWhoisExport(
  results: BulkWhoisResults,
  options: ExportOptions,
): Promise<void> {
  const filePath = await tauriDialog().save({
    title: 'Save export file',
    filters:
      options.filetype === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });
  if (!filePath) return;
  return tauriInvoke('bulk_whois_export', { results, options, path: filePath });
}

/**
 * Bulk WHOIS lookup from raw text content — avoids JS-side .split('\n')
 * and array serialisation. Splits & trims lines server-side via rayon.
 */
export function bulkWhoisLookupFromContent(
  content: string,
  tlds?: string[],
  concurrency = 4,
  timeoutMs = 5000,
): Promise<void> {
  return tauriInvoke('bulk_whois_lookup_from_content', {
    content,
    tlds: tlds ?? null,
    concurrency,
    timeoutMs,
  });
}

/**
 * Bridge — Text operations and CSV parsing.
 * @module bridge/textops
 */

import { tauriInvoke } from './_invoke.js';
import type { ProcessOptions } from '../tools.js';

export function toProcess(content: string, options: ProcessOptions): Promise<string> {
  return tauriInvoke<string>('to_process', { content, options });
}

export function parseCsv(content: string): Promise<unknown> {
  return tauriInvoke('csv_parse', { content });
}

/** Parse a CSV file directly from path (avoids file content crossing IPC). */
export function csvParseFile(path: string): Promise<unknown> {
  return tauriInvoke('csv_parse_file', { path });
}

/**
 * Bridge — Bulk Whois Analyser (BWA) commands.
 * @module bridge/bwa
 */

import { tauriInvoke } from './_invoke.js';

export function bwaAnalyserStart(data: unknown): Promise<unknown> {
  return tauriInvoke('bwa_analyser_start', { data });
}

/**
 * Pre-render BWA table HTML server-side — avoids N×M createElement calls.
 * Returns { thead: string, tbody: string }
 */
export function bwaRenderTableHtml(
  records: Record<string, unknown>[],
): Promise<{ thead: string; tbody: string }> {
  return tauriInvoke<{ thead: string; tbody: string }>('bwa_render_table_html', {
    records,
  });
}

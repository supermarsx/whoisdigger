/**
 * Bridge — History and cache persistence.
 * @module bridge/history
 */

import { tauriInvoke } from './_invoke.js';
import type { HistoryPageResult } from './types.js';

export function historyGet(limit = 50): Promise<unknown[]> {
  return tauriInvoke<unknown[]>('db_gui_history_get', { limit });
}

/** Server-side filtered + paginated history query (SQL-level). */
export function historyGetFiltered(opts?: {
  query?: string;
  status?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}): Promise<HistoryPageResult> {
  return tauriInvoke<HistoryPageResult>('db_gui_history_get_filtered', {
    query: opts?.query ?? null,
    status: opts?.status ?? null,
    days: opts?.days ?? null,
    page: opts?.page ?? 0,
    pageSize: opts?.pageSize ?? 50,
  });
}

export function historyClear(): Promise<void> {
  return tauriInvoke('db_gui_history_clear');
}

export function historyMerge(paths: string[]): Promise<void> {
  return tauriInvoke('history_merge', { paths });
}

// ─── Cache ──────────────────────────────────────────────────────────────────

export function cacheGet(
  type: string,
  domain: string,
  opts?: { ttl?: number },
): Promise<string | undefined> {
  const key = `${type}:${domain}`;
  const ttlMs = opts?.ttl ? opts.ttl * 1000 : null;
  return tauriInvoke<string | undefined>('db_gui_cache_get', { key, ttlMs });
}

export function cacheSet(
  type: string,
  domain: string,
  response: string,
  _opts?: { ttl?: number },
): Promise<void> {
  const key = `${type}:${domain}`;
  return tauriInvoke('db_gui_cache_set', { key, response, maxEntries: 1000 });
}

export function cacheClear(): Promise<void> {
  return tauriInvoke('db_gui_cache_clear');
}

export function cacheMerge(paths: string[]): Promise<void> {
  return tauriInvoke('cache_merge', { paths });
}

/**
 * Bridge — Stats worker lifecycle.
 * @module bridge/stats
 */

import { tauriInvoke } from './_invoke.js';

export function statsStart(configPath: string, dataPath: string): Promise<number> {
  return tauriInvoke<number>('stats_start', { configPath, dataPath });
}

export function statsRefresh(id: number): Promise<void> {
  return tauriInvoke('stats_refresh', { id });
}

export function statsStop(id: number): Promise<void> {
  return tauriInvoke('stats_stop', { id });
}

export function statsGet(configPath: string, dataPath: string): Promise<unknown> {
  return tauriInvoke('stats_get', { configPath, dataPath });
}

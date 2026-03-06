/**
 * Bridge — Domain monitoring.
 * @module bridge/monitor
 */

import { tauriInvoke } from './_invoke.js';

export function monitorStart(): Promise<void> {
  return tauriInvoke('monitor_start');
}

export function monitorStop(): Promise<void> {
  return tauriInvoke('monitor_stop');
}

export function monitorLookup(domain: string): Promise<unknown> {
  return tauriInvoke('monitor_lookup', { domain });
}

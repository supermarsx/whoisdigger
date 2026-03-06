/**
 * Bridge — Proxy and lookup settings state.
 * @module bridge/proxy
 */

import { tauriInvoke } from './_invoke.js';
import type { ProxySettings, LookupSettings } from './types.js';

export function proxySetSettings(settings: ProxySettings): Promise<void> {
  return tauriInvoke('proxy_set_settings', { settings });
}

export function proxyGetSettings(): Promise<ProxySettings> {
  return tauriInvoke<ProxySettings>('proxy_get_settings');
}

export function lookupSetSettings(settings: LookupSettings): Promise<void> {
  return tauriInvoke('lookup_set_settings', { settings });
}

export function lookupGetSettings(): Promise<LookupSettings> {
  return tauriInvoke<LookupSettings>('lookup_get_settings');
}

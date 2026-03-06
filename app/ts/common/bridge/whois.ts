/**
 * Bridge — WHOIS, DNS, RDAP lookups and availability checks.
 * @module bridge/whois
 */

import { tauriInvoke } from './_invoke.js';
import type DomainStatus from '../status.js';
import type { WhoisResult, LookupSettings, AvailabilitySettings } from './types.js';

export function whoisLookup(domain: string): Promise<string> {
  return tauriInvoke<string>('whois_lookup', { domain });
}

export function whoisLookupWithSettings(domain: string, settings: LookupSettings): Promise<string> {
  return tauriInvoke<string>('whois_lookup_with_settings', { domain, settings });
}

export function dnsLookup(domain: string): Promise<boolean> {
  return tauriInvoke<boolean>('dns_lookup_cmd', { domain });
}

export function rdapLookup(domain: string): Promise<string> {
  return tauriInvoke<string>('rdap_lookup_cmd', { domain });
}

export function availabilityCheck(text: string): Promise<DomainStatus> {
  return tauriInvoke<DomainStatus>('availability_check', { text });
}

export function availabilityCheckWithSettings(
  text: string,
  settings: AvailabilitySettings,
): Promise<DomainStatus> {
  return tauriInvoke<DomainStatus>('availability_check_with_settings', { text, settings });
}

export function domainParameters(
  domain: string | null,
  status: DomainStatus | null,
  text: string,
  extra?: Record<string, unknown>,
): Promise<WhoisResult> {
  return tauriInvoke<WhoisResult>('availability_params', {
    domain: domain ?? null,
    status: status ?? null,
    text,
    ...(extra ? { extra } : {}),
  });
}

/** Parse raw WHOIS text into a key-value JSON map. */
export function whoisParse(text: string): Promise<Record<string, string>> {
  return tauriInvoke<Record<string, string>>('whois_parse', { text });
}

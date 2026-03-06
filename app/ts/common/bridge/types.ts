/**
 * Bridge Types — shared interfaces for Tauri IPC payloads.
 *
 * Domain-specific types used across multiple bridge modules are
 * centralised here so consumers can import them independently.
 *
 * @module bridge/types
 */

import type DomainStatus from '../status.js';

// ─── Domain / WHOIS Types ───────────────────────────────────────────────────

/** Result of a WHOIS domain-parameter extraction. */
export interface WhoisResult {
  domain?: string;
  status?: DomainStatus;
  registrar?: string;
  company?: string;
  creationDate?: string;
  updateDate?: string;
  expiryDate?: string;
  whoisreply?: string;
  whoisJson?: Record<string, string>;
}

/** Settings for a WHOIS lookup request. */
export interface LookupSettings {
  general?: {
    timeout?: number;
    follow?: number;
    verbose?: boolean;
    psl?: boolean;
    timeBetween?: number;
  };
  conversion?: {
    algorithm?: string;
    enablePunycode?: boolean;
    enablePsl?: boolean;
    enableCapitalisation?: boolean;
  };
  randomizeFollow?: { randomize: boolean; minimumDepth?: number; maximumDepth?: number };
  randomizeTimeout?: { randomize: boolean; minimum?: number; maximum?: number };
  randomizeTimeBetween?: { randomize: boolean; minimum?: number; maximum?: number };
}

/** Settings for availability heuristics. */
export interface AvailabilitySettings {
  uniregistry?: boolean;
  ratelimit?: boolean;
  unparsable?: boolean;
  expired?: boolean;
  dnsFailureUnavailable?: boolean;
}

// ─── Profile Types ──────────────────────────────────────────────────────────

/** A saved settings profile entry. */
export interface ProfileEntry {
  id: string;
  name: string;
  file: string;
  mtime?: number;
}

// ─── Proxy Types ────────────────────────────────────────────────────────────

/** Proxy configuration for WHOIS lookups. */
export interface ProxySettings {
  enable: boolean;
  mode?: 'single' | 'multi';
  multimode?: 'roundrobin' | 'random' | 'failover';
  single?: string;
  list?: Array<{ host: string; port: number; username?: string; password?: string; protocol?: string }>;
  username?: string;
  password?: string;
  retries?: number;
}

// ─── History Types ──────────────────────────────────────────────────────────

/** Paginated, filtered history result from the backend. */
export interface HistoryPageResult {
  entries: { domain: string; status: string; timestamp: number }[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── File / Stat Types ──────────────────────────────────────────────────────

/** Base stat information mirroring Node's fs.Stats / Tauri's fs_stat. */
export interface FileStats {
  size: number;
  mtimeMs?: number;
  mtime?: string | Date;
  atime?: string | Date;
  isDirectory?: boolean | (() => boolean);
  isFile?: boolean | (() => boolean);
  filename?: string;
  humansize?: string;
  linecount?: number;
  minestimate?: string;
  maxestimate?: string;
  filepreview?: string;
  errors?: string;
}

/** Enriched file metadata returned by the `file_info` backend command. */
export interface FileInfoResult {
  filename: string;
  size: number;
  humanSize: string;
  mtimeMs: number;
  mtimeFormatted: string | null;
  atimeFormatted: string | null;
  lineCount: number;
  filePreview: string;
  minEstimate: string;
  maxEstimate: string | null;
}

/** Time estimates returned by `bulk_estimate_time`. */
export interface TimeEstimateResult {
  min: string;
  max: string | null;
}

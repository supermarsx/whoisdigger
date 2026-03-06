/**
 * Bridge — File system, file info, conversions, path helpers, and watcher.
 * @module bridge/filesystem
 */

import { tauriInvoke } from './_invoke.js';
import type { FileStats, FileInfoResult, TimeEstimateResult } from './types.js';

// Re-export types that consumers may need
export type { FileStats, FileInfoResult, TimeEstimateResult };

// ─── File System ────────────────────────────────────────────────────────────

export namespace fs {
  export function readFile(filePath: string): Promise<string> {
    return tauriInvoke<string>('fs_read_file', { path: filePath });
  }

  export function writeFile(filePath: string, content: string): Promise<void> {
    return tauriInvoke('fs_write_file', { path: filePath, content });
  }

  export function exists(filePath: string): Promise<boolean> {
    return tauriInvoke<boolean>('fs_exists', { path: filePath });
  }

  export function stat(filePath: string): Promise<FileStats> {
    return tauriInvoke<FileStats>('fs_stat', { path: filePath });
  }

  export function readdir(dirPath: string): Promise<string[]> {
    return tauriInvoke<string[]>('fs_readdir', { path: dirPath });
  }

  export function unlink(filePath: string): Promise<void> {
    return tauriInvoke('fs_unlink', { path: filePath });
  }

  export function access(filePath: string): Promise<void> {
    return tauriInvoke('fs_access', { path: filePath });
  }

  export function mkdir(dirPath: string): Promise<void> {
    return tauriInvoke('fs_mkdir', { path: dirPath });
  }
}

// ─── File Info & Conversions ────────────────────────────────────────────────

/**
 * Retrieve enriched file information including human-readable size,
 * line count, preview, formatted dates, and bulk lookup time estimates.
 */
export function fileInfo(
  filePath: string,
  options?: {
    si?: boolean;
    timeBetween?: number;
    timeBetweenMin?: number;
    timeBetweenMax?: number;
    randomize?: boolean;
  },
): Promise<FileInfoResult> {
  return tauriInvoke<FileInfoResult>('file_info', {
    path: filePath,
    si: options?.si ?? true,
    timeBetween: options?.timeBetween ?? null,
    timeBetweenMin: options?.timeBetweenMin ?? null,
    timeBetweenMax: options?.timeBetweenMax ?? null,
    randomize: options?.randomize ?? null,
  });
}

/** Get time estimates for a given line count and lookup timing settings. */
export function bulkEstimateTime(
  lineCount: number,
  options?: {
    timeBetween?: number;
    timeBetweenMin?: number;
    timeBetweenMax?: number;
    randomize?: boolean;
  },
): Promise<TimeEstimateResult> {
  return tauriInvoke<TimeEstimateResult>('bulk_estimate_time', {
    lineCount,
    timeBetween: options?.timeBetween ?? null,
    timeBetweenMin: options?.timeBetweenMin ?? null,
    timeBetweenMax: options?.timeBetweenMax ?? null,
    randomize: options?.randomize ?? null,
  });
}

/** Convert bytes to a human-readable file size string. */
export function convertFileSize(bytes: number, si = true): Promise<string> {
  return tauriInvoke<string>('convert_file_size', { bytes, si });
}

/** Convert milliseconds to a human-readable duration string. */
export function convertDuration(durationMs: number): Promise<string> {
  return tauriInvoke<string>('convert_duration', { durationMs });
}

// ─── Path Helpers ───────────────────────────────────────────────────────────

export namespace path {
  /** Join path segments using the platform path separator. */
  export function join(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/[/\\]+/g, '/');
  }

  /** Return the trailing file/folder name from a path string. */
  export function basename(p: string): string {
    return (p || '').split(/[/\\]/).filter(Boolean).pop() || '';
  }
}

// ─── File Watcher Stub ──────────────────────────────────────────────────────

/**
 * Stub for the Electron-style fs.watch API.
 * Tauri doesn't expose fs.watch directly in the renderer.
 */
export async function watch(): Promise<{ close: () => void }> {
  return { close: () => {} };
}

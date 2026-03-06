/**
 * Bridge — File dialogs (open / save).
 * @module bridge/dialogs
 */

import { tauriDialog, type TauriOpenOptions, type TauriSaveOptions } from './_invoke.js';

export type { TauriOpenOptions, TauriSaveOptions };

export function openFileDialog(
  options?: TauriOpenOptions,
): Promise<string | string[] | null> {
  return tauriDialog().open(options);
}

export function saveFileDialog(
  options?: TauriSaveOptions,
): Promise<string | null> {
  return tauriDialog().save(options);
}

/** Opens a file picker for text/list/csv files. */
export function openTextFileDialog(): Promise<string | string[] | null> {
  return openFileDialog({
    multiple: true,
    filters: [{ name: 'Text / List', extensions: ['txt', 'list', 'csv'] }],
  });
}

/** Opens a file picker for CSV/JSON files (BWA). */
export function openCsvJsonDialog(): Promise<string | string[] | null> {
  return openFileDialog({
    multiple: true,
    filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }],
  });
}

/** Opens a file picker for SQLite/JSON database files. */
export function openDbFileDialog(): Promise<string[] | null> {
  return openFileDialog({
    multiple: true,
    filters: [{ name: 'SQLite / JSON', extensions: ['sqlite', 'db', 'sqlite3', 'json'] }],
  }) as Promise<string[] | null>;
}

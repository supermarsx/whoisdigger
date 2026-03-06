/**
 * Bridge — Settings profile management.
 * @module bridge/profiles
 */

import { tauriInvoke, tauriDialog } from './_invoke.js';
import type { ProfileEntry } from './types.js';

export function profilesList(): Promise<ProfileEntry[]> {
  return tauriInvoke<ProfileEntry[]>('profiles_list');
}

export function profilesCreate(name: string, copyCurrent = false): Promise<{ id: string }> {
  return tauriInvoke<{ id: string }>('profiles_create', { name, copyCurrent });
}

export function profilesRename(id: string, newName: string): Promise<void> {
  return tauriInvoke('profiles_rename', { id, newName });
}

export function profilesDelete(id: string): Promise<void> {
  return tauriInvoke('profiles_delete', { id });
}

export function profilesSetCurrent(id: string): Promise<void> {
  return tauriInvoke('profiles_set_current', { id });
}

export function profilesExport(id?: string): Promise<string> {
  return tauriInvoke<string>('profiles_export', { id: id ?? null });
}

export function profilesGetCurrent(): Promise<string> {
  return tauriInvoke<string>('profiles_get_current');
}

export async function profilesImport(): Promise<ProfileEntry | undefined> {
  const zipFiles = await tauriDialog().open({
    multiple: false,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  });
  if (!zipFiles) return undefined;
  const chosen = Array.isArray(zipFiles) ? zipFiles[0] : zipFiles;
  // Inline basename to avoid cross-module dependency
  const profileName = ((chosen || '').split(/[/\\]/).filter(Boolean).pop() || '').replace(/\.zip$/i, '');
  return tauriInvoke<ProfileEntry>('profiles_import', { zipPath: chosen, profileName });
}

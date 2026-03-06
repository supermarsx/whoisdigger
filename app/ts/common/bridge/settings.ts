/**
 * Bridge — Settings persistence and configuration management.
 * @module bridge/settings
 */

import { tauriInvoke, tauriDialog } from './_invoke.js';

export async function settingsLoad(): Promise<{ settings: Record<string, unknown>; userDataPath: string }> {
  const userDataPath = await tauriInvoke<string>('app_get_user_data_path');
  const settingsJson = await tauriInvoke<string>('settings_load', { filename: 'settings.json' });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(settingsJson) as Record<string, unknown>;
  } catch {
    /* use empty */
  }
  return { settings: parsed, userDataPath };
}

export function settingsSave(settingsObj: unknown): Promise<string> {
  return tauriInvoke<string>('settings_save', {
    filename: 'settings.json',
    content: JSON.stringify(settingsObj),
  }).then(() => 'SAVED');
}

export function configDelete(filename: string): Promise<void> {
  return tauriInvoke('config_delete', { filename });
}

export async function configExport(): Promise<string> {
  return tauriInvoke<string>('config_export');
}

export async function configImport(): Promise<void> {
  const files = await tauriDialog().open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!files) return;
  const filePath = Array.isArray(files) ? files[0] : files;
  const content = await tauriInvoke<string>('fs_read_file', { path: filePath });
  await tauriInvoke('config_import', { content });
}

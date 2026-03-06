/**
 * Bridge — Application window management, i18n, and utility commands.
 * @module bridge/app
 */

import { tauriInvoke, tauriWindow } from './_invoke.js';

// ─── App / Window ───────────────────────────────────────────────────────────

export namespace app {
  export function getBaseDir(): Promise<string> {
    return tauriInvoke<string>('app_get_base_dir');
  }

  export function getUserDataPath(): Promise<string> {
    return tauriInvoke<string>('app_get_user_data_path');
  }

  export async function openDataDir(): Promise<void> {
    const udp = await getUserDataPath();
    await tauriInvoke('shell_open_path', { path: udp });
  }

  export function openPath(pathStr: string): Promise<string> {
    return tauriInvoke<string>('shell_open_path', { path: pathStr });
  }

  export function minimize(): Promise<void> {
    return tauriWindow().getCurrentWindow().minimize();
  }

  export function toggleMaximize(): Promise<void> {
    return tauriWindow().getCurrentWindow().toggleMaximize();
  }

  export function close(): Promise<void> {
    return tauriWindow().getCurrentWindow().close();
  }

  export function reload(): void {
    window.location.reload();
  }

  export function toggleDevtools(): void {
    // Dev-tools toggle is handled by OS shortcut in Tauri (Cmd+Shift+I / F12)
  }
}

// ─── I18n ───────────────────────────────────────────────────────────────────

export function i18nLoad(lang: string): Promise<Record<string, string>> {
  return tauriInvoke<Record<string, string>>('i18n_load', { lang });
}

/**
 * Count lines in a text blob server-side — avoids materialising a full
 * .split('\n') array in JS just for a length check.
 */
export function countLines(text: string): Promise<number> {
  return tauriInvoke<number>('count_lines', { text });
}

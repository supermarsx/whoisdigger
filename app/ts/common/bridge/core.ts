/**
 * Bridge Core — event listener management.
 *
 * Provides `listen` / `unlisten` for Tauri backend events. Only one
 * listener per event name is tracked; subsequent registrations replace
 * the previous one.
 *
 * @module bridge/core
 */

import { tauriListen } from './_invoke.js';

// ─── Event Listener Management ──────────────────────────────────────────────

const _unlisteners: Record<string, () => void> = {};

/**
 * Listen for a Tauri event from the backend.
 * Only one listener per event name is tracked (subsequent calls replace the
 * previous registration). Returns the unlisten function.
 */
export async function listen<T = unknown>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  // Remove existing listener for this event, if any
  _unlisteners[event]?.();

  const unlisten = await tauriListen<T>(event, (ev) => handler(ev.payload));
  _unlisteners[event] = unlisten;
  return unlisten;
}

/** Remove a previously registered event listener. */
export function unlisten(event: string): void {
  _unlisteners[event]?.();
  delete _unlisteners[event];
}

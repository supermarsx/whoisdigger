/**
 * Internal Tauri primitives — not part of the public bridge API.
 *
 * Sibling bridge modules import `tauriInvoke`, `tauriDialog`, `tauriWindow`
 * from here.  This module is NOT re-exported from the bridge barrel.
 *
 * @internal
 */

// ─── Tauri Runtime Type Declarations ────────────────────────────────────────

interface TauriEvent<T = unknown> {
  payload: T;
}

export interface TauriDialogFilter {
  name: string;
  extensions: string[];
}

export interface TauriOpenOptions {
  multiple?: boolean;
  filters?: TauriDialogFilter[];
}

export interface TauriSaveOptions {
  title?: string;
  filters?: TauriDialogFilter[];
}

interface TauriWindow {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
}

interface TauriGlobal {
  core: {
    invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  };
  event: {
    listen<T = unknown>(
      event: string,
      handler: (event: TauriEvent<T>) => void
    ): Promise<() => void>;
  };
  dialog: {
    open(options?: TauriOpenOptions): Promise<string | string[] | null>;
    save(options?: TauriSaveOptions): Promise<string | null>;
  };
  window: {
    getCurrentWindow(): TauriWindow;
  };
}

declare global {
  interface Window {
    __TAURI__: TauriGlobal;
  }
}

// ─── Core Accessors ─────────────────────────────────────────────────────────

const tauriCore = () => window.__TAURI__.core;
const tauriEvt = () => window.__TAURI__.event;

/** Invoke a Tauri command with optional typed arguments. */
export function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return tauriCore().invoke<T>(cmd, args);
}

/** Access the raw Tauri event listener API. */
export function tauriListen<T = unknown>(
  event: string,
  handler: (event: TauriEvent<T>) => void,
): Promise<() => void> {
  return tauriEvt().listen<T>(event, handler);
}

/** Access the Tauri dialog API (open / save). */
export const tauriDialog = () => window.__TAURI__.dialog;

/** Access the Tauri window API (minimize / maximize / close). */
export const tauriWindow = () => window.__TAURI__.window;

/**
 * Tauri Bridge — backward-compatible barrel.
 *
 * The monolithic tauriBridge has been split into per-concern modules under
 * `./bridge/`.  This file re-exports the full public API so that existing
 * imports (`from '../common/tauriBridge.js'`) continue to work.
 *
 * **New code should import from specific bridge modules instead:**
 *
 * ```ts
 * import { whoisLookup } from '../common/bridge/whois.js';
 * import { listen }      from '../common/bridge/core.js';
 * import { app }         from '../common/bridge/app.js';
 * ```
 *
 * @module tauriBridge
 */

export * from './bridge/index.js';

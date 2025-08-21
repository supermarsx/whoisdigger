import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { IpcChannel } from '../common/ipcChannels.js';
import type { IpcContracts } from '../common/ipcContracts.js';

/**
 * Typed wrapper around `ipcMain.handle`.
 *
 * Ensures that handlers registered for a channel conform to the request and
 * response types declared in {@link IpcContracts}.
 */
export function handle<C extends IpcChannel>(
  channel: C,
  listener: (
    event: IpcMainInvokeEvent,
    ...args: IpcContracts[C]['request']
  ) => Promise<IpcContracts[C]['response']> | IpcContracts[C]['response']
): void {
  ipcMain.handle(channel, listener as any);
}

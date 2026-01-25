import { IpcChannel } from '../../common/ipcChannels.js';
import type { BulkWhoisResults } from '../../common/bulkwhois/types.js';

let bulkResults: BulkWhoisResults | null = null;

export function registerResultListener(electron: {
  on: (channel: string, listener: (...args: any[]) => void) => void;
}): void {
  electron.on(IpcChannel.BulkwhoisResultReceive, (_event, results: BulkWhoisResults) => {
    bulkResults = results;
  });
}

export function getBulkResults(): BulkWhoisResults | null {
  return bulkResults;
}

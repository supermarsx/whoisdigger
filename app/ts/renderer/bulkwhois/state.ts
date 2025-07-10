import { IpcChannel } from '../../common/ipcChannels.js';

let bulkResults: any;

export function registerResultListener(electron: {
  on: (channel: string, listener: (...args: any[]) => void) => void;
}): void {
  electron.on(IpcChannel.BulkwhoisResultReceive, (_event, results) => {
    bulkResults = results;
  });
}

export function getBulkResults() {
  return bulkResults;
}

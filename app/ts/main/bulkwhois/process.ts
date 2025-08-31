import { ipcMain } from 'electron';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { BulkWhoisManager, getDomainSetup } from './manager.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { handle } from '../ipc.js';

const manager = new BulkWhoisManager();

handle(
  IpcChannel.BulkwhoisLookup,
  (event: IpcMainInvokeEvent, domains: string[], tlds: string[]) => {
    manager.startLookup(event, domains, tlds);
  }
);

ipcMain.on(IpcChannel.BulkwhoisLookupPause, (event: IpcMainEvent) => {
  manager.pause(event);
});

ipcMain.on(IpcChannel.BulkwhoisLookupContinue, (event: IpcMainEvent) => {
  manager.resume(event);
});

ipcMain.on(IpcChannel.BulkwhoisLookupStop, (event: IpcMainEvent) => {
  manager.stop(event);
});

export { getDomainSetup };

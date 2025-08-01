import { ipcMain, shell } from 'electron';
import Papa from 'papaparse';
import { isDomainAvailable, getDomainParameters } from '#common/availability';
import DomainStatus from '#common/status';
import { IpcChannel } from '#common/ipcChannels';
import { toJSON } from '#common/parser';
import { getUserDataPath } from '#common/settings';

ipcMain.handle(IpcChannel.ParseCsv, async (_e, text: string) => {
  return Papa.parse(text, { header: true });
});

ipcMain.handle(IpcChannel.AvailabilityCheck, async (_e, text: string) => {
  return isDomainAvailable(text);
});

ipcMain.handle(
  IpcChannel.DomainParameters,
  async (
    _e,
    domain: string | null,
    status: DomainStatus | null,
    text: string,
    json?: Record<string, unknown>
  ) => {
    return getDomainParameters(
      domain,
      status,
      text,
      json ?? (toJSON(text) as Record<string, unknown>)
    );
  }
);

ipcMain.handle(IpcChannel.OpenPath, async (_e, p: string) => {
  return shell.openPath(p);
});

ipcMain.handle(IpcChannel.OpenDataDir, async () => {
  const dir = getUserDataPath();
  return shell.openPath(dir);
});

import type { IpcChannel } from './ipcChannels.js';
import type DomainStatus from './status.js';
import type { WhoisResult } from './availability.js';
import type { ProcessOptions } from './tools.js';

/**
 * Mapping between IPC channels and their request/response payloads.
 *
 * `request` describes the arguments passed when invoking or sending on the
 * channel. `response` describes the value resolved from `ipcRenderer.invoke`
 * or returned by the registered `ipcMain.handle` listener.
 */
export interface IpcContracts {
  [IpcChannel.BulkwhoisLookup]: {
    request: [string[], string[]];
    response: void;
  };
  [IpcChannel.BulkwhoisLookupPause]: { request: []; response: void };
  [IpcChannel.BulkwhoisLookupContinue]: { request: []; response: void };
  [IpcChannel.BulkwhoisLookupStop]: { request: []; response: void };
  [IpcChannel.BulkwhoisInputFile]: {
    request: [];
    response: string[] | undefined;
  };
  [IpcChannel.BulkwhoisInputWordlist]: { request: []; response: void };
  [IpcChannel.BulkwhoisWordlistInputConfirmation]: { request: []; response: void };
  [IpcChannel.BulkwhoisStatusUpdate]: {
    request: [string, unknown];
    response: void;
  };
  [IpcChannel.BulkwhoisFileinputConfirmation]: {
    request: [string | string[] | null, boolean?];
    response: void;
  };
  [IpcChannel.BulkwhoisResultReceive]: { request: [unknown]; response: void };
  [IpcChannel.BulkwhoisExport]: {
    request: [any, any];
    response: void;
  };
  [IpcChannel.BulkwhoisExportCancel]: { request: []; response: void };
  [IpcChannel.BulkwhoisExportError]: { request: [string]; response: void };
  [IpcChannel.BwaInputFile]: {
    request: [];
    response: string[] | undefined;
  };
  [IpcChannel.BwaAnalyserStart]: { request: [unknown]; response: unknown };
  [IpcChannel.StatsStart]: {
    request: [string, string];
    response: number;
  };
  [IpcChannel.StatsRefresh]: { request: [number]; response: void };
  [IpcChannel.StatsStop]: { request: [number]; response: void };
  [IpcChannel.StatsGet]: {
    request: [string, string];
    response: unknown;
  };
  [IpcChannel.StatsUpdate]: { request: [unknown]; response: void };
  [IpcChannel.ToInputFile]: {
    request: [];
    response: string[] | undefined;
  };
  [IpcChannel.ToProcess]: {
    request: [string, ProcessOptions];
    response: string;
  };
  [IpcChannel.SingleWhoisLookup]: { request: [string]; response: string };
  [IpcChannel.ParseCsv]: { request: [string]; response: unknown };
  [IpcChannel.AvailabilityCheck]: { request: [string]; response: DomainStatus };
  [IpcChannel.DomainParameters]: {
    request: [string | null, DomainStatus | null, string, Record<string, unknown>?];
    response: WhoisResult;
  };
  [IpcChannel.OpenPath]: { request: [string]; response: string };
  [IpcChannel.OpenDataDir]: { request: []; response: string };
  [IpcChannel.PathJoin]: { request: string[]; response: string };
  [IpcChannel.PathBasename]: { request: [string]; response: string };
  [IpcChannel.GetBaseDir]: { request: []; response: string };
  [IpcChannel.I18nLoad]: { request: [string]; response: string };
  [IpcChannel.BwFileRead]: { request: [string]; response: Buffer };
  [IpcChannel.BwaFileRead]: { request: [string]; response: Buffer };
}

export type IpcRequest<C extends IpcChannel> = IpcContracts[C]['request'];
export type IpcResponse<C extends IpcChannel> = IpcContracts[C]['response'];

import { IpcChannel } from './ipcChannels.js';
import type { IpcRequest, IpcResponse } from './ipcContracts.js';

// Correct request shape
const lookupArgs: IpcRequest<IpcChannel.BulkwhoisLookup> = [[], []];

// @ts-expect-error - second argument should be string[]
const wrongArgs: IpcRequest<IpcChannel.BulkwhoisLookup> = [[], 123];

// Ensure response type can be referenced
const _lookupResponse: IpcResponse<IpcChannel.BulkwhoisLookup> = undefined;

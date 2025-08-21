import path from 'path';
import { IpcChannel } from '../common/ipcChannels.js';
import { handle } from './ipc.js';

handle(IpcChannel.PathJoin, (_e, ...args: string[]) => {
  return path.join(...args);
});

handle(IpcChannel.PathBasename, (_e, p: string) => {
  return path.basename(p);
});

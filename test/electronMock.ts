import fs from 'fs';
import path from 'path';

export const mockGetPath = jest.fn().mockReturnValue(path.join(__dirname, '../app/data'));
export const mockIpcSend = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: { send: mockIpcSend },
  dialog: {},
  app: { getPath: mockGetPath }
}));

if (!(global as any).window) {
  (global as any).window = {};
}

(global as any).window.electron = {
  send: jest.fn(),
  getBaseDir: jest.fn(() => Promise.resolve(__dirname)),
  invoke: jest.fn((channel: string, ...args: any[]) => {
    if (channel === 'settings:load') {
      const { load, getUserDataPath } = require('../app/ts/common/settings');
      return { settings: load(), userDataPath: getUserDataPath() };
    }
    if (channel === 'settings:save') {
      const { save } = require('../app/ts/common/settings');
      return save(args[0]);
    }
    return Promise.resolve(undefined);
  }),
  on: jest.fn(),
  openPath: jest.fn(),
  readFile: (p: string, opts?: BufferEncoding | fs.ReadFileOptions) =>
    fs.promises.readFile(p, opts),
  stat: (p: string) => fs.promises.stat(p),
  readdir: (p: string, opts?: fs.ReaddirOptions) => fs.promises.readdir(p, opts),
  unlink: (p: string) => fs.promises.unlink(p),
  access: (p: string, mode?: number) => fs.promises.access(p, mode),
  exists: async (p: string) => fs.existsSync(p),
  watch: async (
    p: string,
    opts: fs.WatchOptions,
    cb: (ev: { event: string; filename: string | null }) => void
  ) => {
    const watcher = fs.watch(p, opts, (event, filename) => cb({ event, filename }));
    return { close: () => watcher.close() };
  },
  path: {
    join: (...args: string[]) => path.join(...args),
    basename: (p: string) => path.basename(p)
  }
};

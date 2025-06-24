import { EventEmitter } from 'events';

export const mockShowSaveDialogSync = jest.fn();
export const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

export const ipcMain = {
  on: jest.fn((channel: string, listener: (...args: any[]) => void) => {
    ipcMainHandlers[channel] = listener;
  }),
  handle: jest.fn((channel: string, listener: (...args: any[]) => any) => {
    ipcMainHandlers[channel] = listener;
  })
};

export const app = undefined as any;
export const BrowserWindow = class {};
export const Menu = {} as any;
export const remote = {} as any;

jest.mock('electron', () => ({
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog: { showSaveDialogSync: mockShowSaveDialogSync },
  remote
}));

import { EventEmitter } from 'events';

export const mockShowSaveDialogSync = jest.fn();
export const mockOpenPath = jest.fn();
export const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

export const mockIpcMain = {
  on: jest.fn((channel: string, listener: (...args: any[]) => void) => {
    ipcMainHandlers[channel] = listener;
  }),
  handle: jest.fn((channel: string, listener: (...args: any[]) => any) => {
    ipcMainHandlers[channel] = listener;
  })
};

export const mockApp = undefined as any;
export const MockBrowserWindow = class {};
export const mockMenu = {} as any;
export const mockRemote = {} as any;

// Export compatibility aliases for tests that import these names
export const app = mockApp;
export const BrowserWindow = MockBrowserWindow;
export const Menu = mockMenu;
export const remote = mockRemote;

jest.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: MockBrowserWindow,
  Menu: mockMenu,
  ipcMain: mockIpcMain,
  dialog: { showSaveDialogSync: (...args: any[]) => mockShowSaveDialogSync(...args) },
  shell: { openPath: (...args: any[]) => mockOpenPath(...args) },
  remote: mockRemote
}));

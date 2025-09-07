// Minimal Electron stub for Jest unit tests.
// Provides both main and renderer API surfaces used by tests/imported modules.

// Main-process API stubs
export const ipcMain = {
  on: jest.fn(),
  handle: jest.fn()
} as any;

export const app = {
  on: jest.fn(),
  getPath: jest.fn(() => '')
} as any;

class StubWebContents {
  send = jest.fn();
}

export class BrowserWindow {
  static getAllWindows(): Array<{ webContents: StubWebContents }> {
    return [];
  }
  webContents = new StubWebContents();
}

export const Menu = {} as any;

export const dialog = {
  showSaveDialogSync: jest.fn()
} as any;

export const shell = {
  openPath: jest.fn()
} as any;

// Renderer-process API stubs
export const ipcRenderer = {
  send: jest.fn(),
  invoke: jest.fn()
} as any;

export const remote = {} as any;

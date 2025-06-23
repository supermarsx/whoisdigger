export const mockGetPath = jest.fn().mockReturnValue('');
export const mockIpcSend = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: { send: mockIpcSend },
  dialog: {},
  app: undefined,
  remote: { app: { getPath: mockGetPath } }
}));

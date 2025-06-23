const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
export const mockShowOpenDialogSync = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    },
  },
  dialog: { showOpenDialogSync: mockShowOpenDialogSync },
  app: undefined,
  BrowserWindow: class {},
  Menu: {},
}));

import '../app/ts/main/bwa/fileinput';

describe('bwa fileinput handler', () => {
  beforeEach(() => {
    mockShowOpenDialogSync.mockReset();
  });

  test('sends selected file path to renderer', () => {
    const handler = ipcMainHandlers['bwa:input.file'];
    mockShowOpenDialogSync.mockReturnValue('/tmp/test.txt');
    const send = jest.fn();

    handler({ sender: { send } } as any);

    expect(mockShowOpenDialogSync).toHaveBeenCalledWith({
      title: 'Select wordlist file',
      buttonLabel: 'Open',
      properties: ['openFile', 'showHiddenFiles'],
    });
    expect(send).toHaveBeenCalledWith('bwa:fileinput.confirmation', '/tmp/test.txt');
  });

  test('forwards undefined when no file selected', () => {
    const handler = ipcMainHandlers['bwa:input.file'];
    mockShowOpenDialogSync.mockReturnValue(undefined);
    const send = jest.fn();

    handler({ sender: { send } } as any);

    expect(send).toHaveBeenCalledWith('bwa:fileinput.confirmation', undefined);
  });
});

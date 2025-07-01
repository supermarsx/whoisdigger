const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
export const mockShowOpenDialogSync = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    },
    on: jest.fn()
  },
  dialog: { showOpenDialogSync: mockShowOpenDialogSync },
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

import '../app/ts/main/bw/fileinput';

const handler = () => ipcMainHandlers['bw:input.file'];

describe('bw fileinput handler', () => {
  beforeEach(() => {
    mockShowOpenDialogSync.mockReset();
  });

  test('returns selected file path', async () => {
    mockShowOpenDialogSync.mockReturnValue('/tmp/test.txt');
    const result = await handler()({} as any);

    expect(mockShowOpenDialogSync).toHaveBeenCalledWith({
      title: 'Select wordlist file',
      buttonLabel: 'Open',
      properties: ['openFile', 'showHiddenFiles']
    });
    expect(result).toBe('/tmp/test.txt');
  });

  test('returns undefined when no file selected', async () => {
    mockShowOpenDialogSync.mockReturnValue(undefined);
    const result = await handler()({} as any);
    expect(result).toBeUndefined();
  });
});

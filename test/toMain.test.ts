const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
var mockShowDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    },
    on: jest.fn()
  },
  dialog: { showOpenDialogSync: (...args: any[]) => mockShowDialog(...args) },
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

const mockReadFile = jest.fn();

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: { readFile: (...args: any[]) => mockReadFile(...args) }
}));

const mockProcessLines = jest.fn();

jest.mock('../app/ts/common/tools.js', () => ({
  processLines: (...args: any[]) => mockProcessLines(...args)
}));
import '../app/ts/main/to';

const processHandler = () => ipcMainHandlers['to:process'];
const inputHandler = () => ipcMainHandlers['to:input.file'];

describe('to main handler', () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    mockProcessLines.mockReset();
    mockShowDialog.mockReset();
  });

  test('returns processed result', async () => {
    mockReadFile.mockResolvedValue('a\nb');
    mockProcessLines.mockReturnValue(['x', 'y']);
    const result = await processHandler()({} as any, '/tmp/list.txt', { opt: 1 } as any);

    expect(mockReadFile).toHaveBeenCalledWith('/tmp/list.txt', 'utf8');
    expect(mockProcessLines).toHaveBeenCalledWith(['a', 'b'], { opt: 1 });
    expect(result).toBe('x\ny');
  });

  test('throws error when read fails', async () => {
    mockReadFile.mockRejectedValue(new Error('fail'));
    await expect(processHandler()({} as any, '/tmp/list.txt', {})).rejects.toThrow('fail');
  });

  test('returns selected input path', async () => {
    mockShowDialog.mockReturnValue('/tmp/list.txt');
    const result = await inputHandler()({} as any);
    expect(result).toBe('/tmp/list.txt');
  });

  test('returns undefined when canceled', async () => {
    mockShowDialog.mockReturnValue(undefined);
    const result = await inputHandler()({} as any);
    expect(result).toBeUndefined();
  });
});

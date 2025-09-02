import type { ProcessOptions } from '../app/ts/common/tools';

const ipcMainHandlers: Record<string, (...args: unknown[]) => unknown> = {};
const mockShowDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: unknown[]) => unknown) => {
      ipcMainHandlers[channel] = listener;
    },
    on: jest.fn()
  },
  dialog: { showOpenDialogSync: (...args: unknown[]) => mockShowDialog(...args) },
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

const mockReadFile = jest.fn();

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: { readFile: (...args: unknown[]) => mockReadFile(...args) }
}));

const mockProcessLines = jest.fn((lines: string[], options: ProcessOptions): string[] => []);

jest.mock('../app/ts/common/tools.js', () => ({
  processLines: (...args: Parameters<typeof mockProcessLines>) => mockProcessLines(...args)
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
    const opts: ProcessOptions = { prefix: 'pre' };
    const result = await processHandler()({} as unknown, '/tmp/list.txt', opts);

    expect(mockReadFile).toHaveBeenCalledWith('/tmp/list.txt', 'utf8');
    expect(mockProcessLines).toHaveBeenCalledWith(['a', 'b'], opts);
    expect(result).toBe('x\ny');
  });

  test('throws error when read fails', async () => {
    mockReadFile.mockRejectedValue(new Error('fail'));
    await expect(
      processHandler()({} as unknown, '/tmp/list.txt', {} as ProcessOptions)
    ).rejects.toThrow('fail');
  });

  test('returns selected input path', async () => {
    mockShowDialog.mockReturnValue('/tmp/list.txt');
    const result = await inputHandler()({} as unknown);
    expect(result).toBe('/tmp/list.txt');
  });

  test('returns undefined when canceled', async () => {
    mockShowDialog.mockReturnValue(undefined);
    const result = await inputHandler()({} as unknown);
    expect(result).toBeUndefined();
  });
});

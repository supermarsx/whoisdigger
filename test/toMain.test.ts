const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const showDialogMock = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    },
    on: jest.fn()
  },
  dialog: { showOpenDialogSync: showDialogMock },
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

const readFileMock = jest.fn();

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: { readFile: (...args: any[]) => readFileMock(...args) }
}));

const processLinesMock = jest.fn();

jest.mock('../app/ts/common/tools.js', () => ({
  processLines: (...args: any[]) => processLinesMock(...args)
}));
import '../app/ts/main/to';

const processHandler = () => ipcMainHandlers['to:process'];
const inputHandler = () => ipcMainHandlers['to:input.file'];

describe('to main handler', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    processLinesMock.mockReset();
    showDialogMock.mockReset();
  });

  test('returns processed result', async () => {
    readFileMock.mockResolvedValue('a\nb');
    processLinesMock.mockReturnValue(['x', 'y']);
    const result = await processHandler()({} as any, '/tmp/list.txt', { opt: 1 } as any);

    expect(readFileMock).toHaveBeenCalledWith('/tmp/list.txt', 'utf8');
    expect(processLinesMock).toHaveBeenCalledWith(['a', 'b'], { opt: 1 });
    expect(result).toBe('x\ny');
  });

  test('throws error when read fails', async () => {
    readFileMock.mockRejectedValue(new Error('fail'));
    await expect(processHandler()({} as any, '/tmp/list.txt', {})).rejects.toThrow('fail');
  });

  test('returns selected input path', async () => {
    showDialogMock.mockReturnValue('/tmp/list.txt');
    const result = await inputHandler()({} as any);
    expect(result).toBe('/tmp/list.txt');
  });

  test('returns undefined when canceled', async () => {
    showDialogMock.mockReturnValue(undefined);
    const result = await inputHandler()({} as any);
    expect(result).toBeUndefined();
  });
});

const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const showDialogMock = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    },
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    }
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

const handler = () => ipcMainHandlers['to:process'];

describe('to main handler', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    processLinesMock.mockReset();
    showDialogMock.mockReset();
  });

  test('processes file and sends result', async () => {
    readFileMock.mockResolvedValue('a\nb');
    processLinesMock.mockReturnValue(['x', 'y']);
    const send = jest.fn();
    await handler()({ sender: { send } } as any, '/tmp/list.txt', { opt: 1 } as any);

    expect(readFileMock).toHaveBeenCalledWith('/tmp/list.txt', 'utf8');
    expect(processLinesMock).toHaveBeenCalledWith(['a', 'b'], { opt: 1 });
    expect(send).toHaveBeenCalledWith('to:process.result', 'x\ny');
  });

  test('sends error when read fails', async () => {
    readFileMock.mockRejectedValue(new Error('fail'));
    const send = jest.fn();
    await handler()({ sender: { send } } as any, '/tmp/list.txt', {});

    expect(send).toHaveBeenCalledWith('to:process.error', 'fail');
  });
});

const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const mockOpenPath = jest.fn();
const mockParse = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  shell: { openPath: mockOpenPath },
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

jest.mock('papaparse', () => ({ __esModule: true, default: { parse: mockParse } }));

jest.mock('../app/ts/common/availability', () => ({
  isDomainAvailable: jest.fn(),
  getDomainParameters: jest.fn()
}));

jest.mock('../app/ts/common/parser', () => ({
  toJSON: jest.fn()
}));

import { IpcChannel } from '../app/ts/common/ipcChannels';
import '../app/ts/main/utils';
import { isDomainAvailable, getDomainParameters } from '../app/ts/common/availability';
import DomainStatus from '../app/ts/common/status';
import { toJSON } from '../app/ts/common/parser';
import { getUserDataPath } from '../app/ts/common/settings';

const getHandler = (c: string) => ipcMainHandlers[c];

beforeEach(() => {
  mockOpenPath.mockReset();
  mockParse.mockReset();
  (isDomainAvailable as jest.Mock).mockReset();
  (getDomainParameters as jest.Mock).mockReset();
  (toJSON as jest.Mock).mockReset();
});

describe('main utils IPC handlers', () => {
  test('csv parse handler returns parsed rows', async () => {
    const rows = { data: [{ a: 1 }] };
    mockParse.mockReturnValue(rows);
    const handler = getHandler(IpcChannel.ParseCsv);
    const result = await handler({}, 'csv');
    expect(mockParse).toHaveBeenCalledWith('csv', { header: true });
    expect(result).toBe(rows);
  });

  test('availability check handler calls isDomainAvailable', async () => {
    (isDomainAvailable as jest.Mock).mockReturnValue(DomainStatus.Available);
    const handler = getHandler(IpcChannel.AvailabilityCheck);
    const result = await handler({}, 'data');
    expect(isDomainAvailable).toHaveBeenCalledWith('data');
    expect(result).toBe(DomainStatus.Available);
  });

  test('domain parameters handler falls back to toJSON', async () => {
    (toJSON as jest.Mock).mockReturnValue({ j: 1 });
    (getDomainParameters as jest.Mock).mockReturnValue('params');
    const handler = getHandler(IpcChannel.DomainParameters);
    const result = await handler({}, 'example.com', DomainStatus.Available, 'reply');
    expect(toJSON).toHaveBeenCalledWith('reply');
    expect(getDomainParameters).toHaveBeenCalledWith(
      'example.com',
      DomainStatus.Available,
      'reply',
      { j: 1 }
    );
    expect(result).toBe('params');
  });

  test('open path handler forwards to shell.openPath', async () => {
    mockOpenPath.mockResolvedValue('ok');
    const handler = getHandler(IpcChannel.OpenPath);
    const res = await handler({}, '/tmp/file');
    expect(mockOpenPath).toHaveBeenCalledWith('/tmp/file');
    expect(res).toBe('ok');
  });

  test('open data dir handler forwards to shell.openPath', async () => {
    mockOpenPath.mockResolvedValue('ok');
    const handler = getHandler(IpcChannel.OpenDataDir);
    const res = await handler({} as any);
    expect(mockOpenPath).toHaveBeenCalledWith(getUserDataPath());
    expect(res).toBe('ok');
  });
});

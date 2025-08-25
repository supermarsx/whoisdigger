import DomainStatus from '../app/ts/common/status';
import { IpcChannel } from '../app/ts/common/ipcChannels';

const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};
const sendMock = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  dialog: {},
  app: undefined,
  BrowserWindow: class {},
  Menu: {}
}));

jest.mock('../app/ts/common/lookup', () => ({ lookup: jest.fn() }));
jest.mock('../app/ts/common/availability', () => ({ isDomainAvailable: jest.fn() }));

import '../app/ts/main/monitor';
import { settings } from '../app/ts/main/settings-main';
import { lookup } from '../app/ts/common/lookup';
import { isDomainAvailable } from '../app/ts/common/availability';

describe('domain monitor', () => {
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllTimers();
    (lookup as jest.Mock).mockReset();
    (isDomainAvailable as jest.Mock).mockReset();
    sendMock.mockReset();
    settings.monitor = { list: ['a.com'], interval: 1000 } as any;
  });

  test('schedules lookups and emits on change', async () => {
    (lookup as jest.Mock).mockResolvedValue('data');
    (isDomainAvailable as jest.Mock)
      .mockReturnValueOnce(DomainStatus.Available)
      .mockReturnValueOnce(DomainStatus.Available)
      .mockReturnValueOnce(DomainStatus.Unavailable);

    await ipcMainHandlers[IpcChannel.MonitorStart]!({ sender: { send: sendMock } } as any);
    await Promise.resolve();

    expect(sendMock).toHaveBeenCalledWith(
      IpcChannel.MonitorUpdate,
      'a.com',
      DomainStatus.Available
    );
    sendMock.mockClear();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(sendMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(sendMock).toHaveBeenCalledWith(
      IpcChannel.MonitorUpdate,
      'a.com',
      DomainStatus.Unavailable
    );

    await ipcMainHandlers[IpcChannel.MonitorStop]!({} as any);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect((lookup as jest.Mock).mock.calls.length).toBe(3);
  });
});

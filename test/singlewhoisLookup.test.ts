const ipcMainHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => {
      ipcMainHandlers[channel] = listener;
    },
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcMainHandlers[channel] = listener;
    }
  },
  clipboard: { writeText: jest.fn() },
  shell: {},
  app: undefined,
  Menu: {},
  dialog: {},
  remote: {}
}));

const lookupMock = jest.fn();
jest.mock('../app/ts/common/lookup.js', () => ({
  lookup: (...args: any[]) => lookupMock(...args)
}));
jest.mock('../app/ts/common/availability.js', () => ({ isDomainAvailable: () => 'available' }));
jest.mock('../app/ts/common/history.js', () => ({ addEntry: jest.fn() }));

import '../app/ts/main/singlewhois';

describe('singlewhois lookup handler', () => {
  test('returns lookup data', async () => {
    lookupMock.mockResolvedValue('ok');
    const handler = ipcMainHandlers['singlewhois:lookup'];
    const result = await handler({}, 'example.com');
    expect(result).toBe('ok');
  });

  test('propagates errors', async () => {
    lookupMock.mockRejectedValue(new Error('fail'));
    const handler = ipcMainHandlers['singlewhois:lookup'];
    await expect(handler({}, 'bad.com')).rejects.toThrow('fail');
  });
});

const exposeMock = jest.fn();
const ipcSendMock = jest.fn();
const ipcInvokeMock = jest.fn();
const ipcOnMock = jest.fn();
const shellOpenPathMock = jest.fn();

jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: exposeMock },
  ipcRenderer: {
    send: ipcSendMock,
    invoke: ipcInvokeMock,
    on: ipcOnMock
  },
  shell: { openPath: shellOpenPathMock }
}));

describe('preload', () => {
  beforeEach(() => {
    jest.resetModules();
    exposeMock.mockClear();
    ipcSendMock.mockClear();
    ipcInvokeMock.mockClear();
    ipcOnMock.mockClear();
    shellOpenPathMock.mockClear();
    delete (global as any).window;
  });

  test('uses contextBridge when contextIsolated', () => {
    (process as any).contextIsolated = true;
    require('../app/ts/preload');

    expect(exposeMock).toHaveBeenCalledTimes(1);
    const api = exposeMock.mock.calls[0][1];
    expect(typeof api.send).toBe('function');
    api.send('chan', 1);
    expect(ipcSendMock).toHaveBeenCalledWith('chan', 1);
    expect(typeof api.invoke).toBe('function');
    api.invoke('chan', 2);
    expect(ipcInvokeMock).toHaveBeenCalledWith('chan', 2);
    expect(typeof api.dirnameCompat).toBe('function');
    expect(typeof api.on).toBe('function');
    const listener = jest.fn();
    api.on('chan', listener);
    expect(ipcOnMock).toHaveBeenCalled();
    const onHandler = ipcOnMock.mock.calls[0][1];
    onHandler({}, 'a', 'b');
    expect(listener).toHaveBeenCalledWith('a', 'b');
    expect(typeof api.openPath).toBe('function');
    api.openPath('/tmp');
    expect(shellOpenPathMock).toHaveBeenCalledWith('/tmp');
  });

  test('assigns api to window when not contextIsolated', () => {
    (process as any).contextIsolated = false;
    (global as any).window = {};
    require('../app/ts/preload');

    expect(exposeMock).not.toHaveBeenCalled();
    expect((global as any).window.electron).toBeDefined();
    const api = (global as any).window.electron;
    api.send('chan2');
    expect(ipcSendMock).toHaveBeenCalledWith('chan2');
    expect(typeof api.dirnameCompat).toBe('function');
  });
});

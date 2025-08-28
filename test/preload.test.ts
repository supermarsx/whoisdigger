const mockExpose = jest.fn();
const mockIpcSend = jest.fn();
const mockIpcInvoke = jest.fn();
const mockIpcOn = jest.fn();
const mockShellOpenPath = jest.fn();

jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mockExpose },
  ipcRenderer: {
    send: mockIpcSend,
    invoke: mockIpcInvoke,
    on: mockIpcOn
  },
  shell: { openPath: mockShellOpenPath }
}));

describe('preload', () => {
  beforeEach(() => {
    jest.resetModules();
    mockExpose.mockClear();
    mockIpcSend.mockClear();
    mockIpcInvoke.mockClear();
    mockIpcOn.mockClear();
    mockShellOpenPath.mockClear();
    delete (global as any).window;
  });

  test('uses contextBridge when contextIsolated', () => {
    (process as any).contextIsolated = true;
    require('../app/ts/preload.cts');

    expect(mockExpose).toHaveBeenCalledTimes(1);
    const api = mockExpose.mock.calls[0][1];
    expect(typeof api.send).toBe('function');
    api.send('chan', 1);
    expect(mockIpcSend).toHaveBeenCalledWith('chan', 1);
    expect(typeof api.invoke).toBe('function');
    api.invoke('chan', 2);
    expect(mockIpcInvoke).toHaveBeenCalledWith('chan', 2);
    expect(typeof api.getBaseDir).toBe('function');
    expect(typeof api.openDataDir).toBe('function');
    expect(typeof api.on).toBe('function');
    const listener = jest.fn();
    api.on('chan', listener);
    expect(mockIpcOn).toHaveBeenCalled();
    const onHandler = mockIpcOn.mock.calls[0][1];
    onHandler({}, 'a', 'b');
    expect(listener).toHaveBeenCalledWith('a', 'b');
  });

  test('assigns api to window when not contextIsolated', () => {
    (process as any).contextIsolated = false;
    (global as any).window = {};
    require('../app/ts/preload.cts');

    expect(mockExpose).not.toHaveBeenCalled();
    expect((global as any).window.electron).toBeDefined();
    const api = (global as any).window.electron;
    api.send('chan2');
    expect(mockIpcSend).toHaveBeenCalledWith('chan2');
    expect(typeof api.getBaseDir).toBe('function');
    expect(typeof api.openDataDir).toBe('function');
  });
});

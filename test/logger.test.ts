const mockDebug = jest.fn((namespace: string) => {
  const fn = jest.fn();
  (fn as any).namespace = namespace;
  return fn;
});

jest.mock('../app/vendor/debug.js', () => ({
  __esModule: true,
  default: (ns: string) => mockDebug(ns)
}));

describe('logger utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    mockDebug.mockClear();
  });

  test('debugFactory returns function with namespace', () => {
    const { debugFactory } = require('../app/ts/common/logger.ts');
    const fn = debugFactory('x');
    expect(mockDebug).toHaveBeenCalledWith('x');
    expect(typeof fn).toBe('function');
    expect((fn as any).namespace).toBe('x');
  });

  test('errorFactory appends :error', () => {
    const { errorFactory } = require('../app/ts/common/logger.ts');
    const fn = errorFactory('x');
    expect(mockDebug).toHaveBeenCalledWith('x:error');
    expect((fn as any).namespace).toBe('x:error');
  });

  test('renderer logger functions call debug functions', () => {
    const { sendDebug, sendError } = require('../app/ts/renderer/logger.ts');
    expect(mockDebug).toHaveBeenCalledWith('renderer');
    expect(mockDebug).toHaveBeenCalledWith('renderer:error');
    const debugFn = mockDebug.mock.results[0].value;
    const errorFn = mockDebug.mock.results[1].value;
    sendDebug('dmsg');
    expect(debugFn).toHaveBeenCalledWith('dmsg');
    sendError('emsg');
    expect(errorFn).toHaveBeenCalledWith('emsg');
  });
});

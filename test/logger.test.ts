const debugMock = jest.fn((namespace: string) => {
  const fn = jest.fn();
  (fn as any).namespace = namespace;
  return fn;
});

jest.mock('../app/vendor/debug.js', () => ({
  __esModule: true,
  default: (ns: string) => debugMock(ns)
}));

describe('logger utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    debugMock.mockClear();
  });

  test('debugFactory returns function with namespace', () => {
    const { debugFactory } = require('../app/ts/common/logger.ts');
    const fn = debugFactory('x');
    expect(debugMock).toHaveBeenCalledWith('x');
    expect(typeof fn).toBe('function');
    expect((fn as any).namespace).toBe('x');
  });

  test('errorFactory appends :error', () => {
    const { errorFactory } = require('../app/ts/common/logger.ts');
    const fn = errorFactory('x');
    expect(debugMock).toHaveBeenCalledWith('x:error');
    expect((fn as any).namespace).toBe('x:error');
  });

  test('renderer logger functions call debug functions', () => {
    const { sendDebug, sendError } = require('../app/ts/renderer/logger.ts');
    expect(debugMock).toHaveBeenCalledWith('renderer');
    expect(debugMock).toHaveBeenCalledWith('renderer:error');
    const debugFn = debugMock.mock.results[0].value;
    const errorFn = debugMock.mock.results[1].value;
    sendDebug('dmsg');
    expect(debugFn).toHaveBeenCalledWith('dmsg');
    sendError('emsg');
    expect(errorFn).toHaveBeenCalledWith('emsg');
  });
});

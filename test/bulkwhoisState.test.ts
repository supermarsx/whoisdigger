/**
 * Tests for bulkwhois state module (app/ts/renderer/bulkwhois/state.ts)
 * @jest-environment jsdom
 */

const listenHandlers: Record<string, Function> = {};

jest.mock('../app/ts/common/tauriBridge.js', () => ({
  listen: jest.fn((event: string, cb: Function) => {
    listenHandlers[event] = cb;
  }),
}));

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

import { registerResultListener, getBulkResults } from '../app/ts/renderer/bulkwhois/state.js';

describe('bulkwhois state', () => {
  beforeEach(() => {
    Object.keys(listenHandlers).forEach((k) => delete listenHandlers[k]);
  });

  it('getBulkResults returns null initially', () => {
    expect(getBulkResults()).toBeNull();
  });

  it('registers listener and updates state on results', () => {
    registerResultListener();
    expect(listenHandlers['bulk:result']).toBeDefined();

    const mockResults = {
      domains: ['a.com', 'b.com'],
      statuses: ['available', 'unavailable'],
    };

    listenHandlers['bulk:result'](mockResults);
    expect(getBulkResults()).toBe(mockResults);
  });

  it('overwrites previous results', () => {
    registerResultListener();

    listenHandlers['bulk:result']({ first: true });
    listenHandlers['bulk:result']({ second: true });
    expect(getBulkResults()).toEqual({ second: true });
  });
});

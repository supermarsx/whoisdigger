/**
 * Tests for bulkwhois state module (app/ts/renderer/bulkwhois/state.ts)
 */

import { registerResultListener, getBulkResults } from '../app/ts/renderer/bulkwhois/state.js';

describe('bulkwhois state', () => {
  it('getBulkResults returns null initially', () => {
    expect(getBulkResults()).toBeNull();
  });

  it('registers listener and updates state on results', () => {
    const handlers: Record<string, Function> = {};
    const mockElectron = {
      on: (channel: string, listener: Function) => {
        handlers[channel] = listener;
      },
    };

    registerResultListener(mockElectron);
    expect(handlers['bulkwhois:result.receive']).toBeDefined();

    const mockResults = {
      domains: ['a.com', 'b.com'],
      statuses: ['available', 'unavailable'],
    };

    handlers['bulkwhois:result.receive'](null, mockResults);
    expect(getBulkResults()).toBe(mockResults);
  });

  it('overwrites previous results', () => {
    const handlers: Record<string, Function> = {};
    const mockElectron = {
      on: (channel: string, listener: Function) => {
        handlers[channel] = listener;
      },
    };

    registerResultListener(mockElectron);

    handlers['bulkwhois:result.receive'](null, { first: true });
    handlers['bulkwhois:result.receive'](null, { second: true });
    expect(getBulkResults()).toEqual({ second: true });
  });
});

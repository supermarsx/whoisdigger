/**
 * @jest-environment jsdom
 */
/**
 * Structural integrity test: validates that every IPC channel defined in
 * ipcChannels.ts is handled by the tauri-shim.js (no unhandled-channel warning).
 *
 * Also validates that the tauri-shim's send() handles known fire-and-forget channels.
 */

// ── Tauri global mock ──────────────────────────────────────────────────────

const invokeMock = jest.fn().mockResolvedValue(null);
const listenMock = jest.fn().mockResolvedValue(jest.fn());
const saveMock = jest.fn().mockResolvedValue('/fake/path');
const openMock = jest.fn().mockResolvedValue(['/fake/file']);

(window as any).__TAURI__ = {
  core: { invoke: invokeMock },
  event: { listen: listenMock },
  dialog: { save: saveMock, open: openMock },
  window: {
    getCurrentWindow: () => ({
      minimize: jest.fn(),
      toggleMaximize: jest.fn(),
      close: jest.fn(),
      show: jest.fn()
    })
  }
};

require('../app/html/tauri-shim.js');

import { IpcChannel } from '../app/ts/common/ipcChannels.js';

const electron = (window as any).electron;

describe('IpcChannel ↔ Tauri Shim exhaustiveness', () => {
  // Channels that are renderer-to-main events (not request/response)
  // These might be handled by on() rather than invoke(), so we skip them.
  const eventOnlyChannels = new Set([
    IpcChannel.BulkwhoisStatusUpdate,      // main→renderer event
    IpcChannel.BulkwhoisFileinputConfirmation, // main→renderer event
    IpcChannel.BulkwhoisWordlistInputConfirmation, // main→renderer event
    IpcChannel.BulkwhoisResultReceive,      // main→renderer event
    IpcChannel.BulkwhoisExportError,        // main→renderer event
    IpcChannel.StatsUpdate,                 // main→renderer event
    IpcChannel.MonitorUpdate                // main→renderer event
  ]);

  const invokeChannels = Object.values(IpcChannel).filter(
    (ch) => !eventOnlyChannels.has(ch as IpcChannel)
  );

  test.each(invokeChannels)(
    'shim handles invoke("%s") without "Unhandled invoke" warning',
    async (channel) => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      invokeMock.mockResolvedValue(null);

      try {
        await electron.invoke(channel, 'arg1', 'arg2', 'arg3');
      } catch {
        // Some channels may throw if mocks don't return expected values;
        // we only care that it didn't hit the "Unhandled invoke" fallback.
      }

      const unhandledWarning = warnSpy.mock.calls.find(
        (call) => call[0]?.includes?.('Unhandled invoke')
      );
      expect(unhandledWarning).toBeUndefined();

      warnSpy.mockRestore();
    }
  );

  // Validate that event-only channels are properly handled by on()
  const eventChannels = Array.from(eventOnlyChannels);

  test.each(eventChannels)(
    'shim handles on("%s") listener registration',
    async (channel) => {
      const handler = jest.fn();
      await electron.on(channel, handler);
      expect(listenMock).toHaveBeenCalled();
    }
  );
});

/**
 * @jest-environment jsdom
 */
// Mock Tauri global
(window as any).__TAURI__ = {
    core: {
        invoke: jest.fn()
    },
    event: {
        listen: jest.fn().mockResolvedValue(() => {})
    },
    dialog: {
        save: jest.fn()
    }
};

// Import shim (we might need to handle the fact it's not a module)
// For testing, we can just eval it or copy the logic.
// Let's assume we can require it if we wrap it or just mock the global state.

require('../app/html/tauri-shim.js');

describe('Tauri Shim', () => {
    const electron = (window as any).electron;
    const invokeMock = (window as any).__TAURI__.core.invoke;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('maps singlewhois:lookup', async () => {
        invokeMock.mockResolvedValue('whois data');
        const res = await electron.invoke('singlewhois:lookup', 'example.com');
        expect(invokeMock).toHaveBeenCalledWith('whois_lookup', { domain: 'example.com' });
        expect(res).toBe('whois data');
    });

    test('maps bulkwhois:lookup', async () => {
        invokeMock.mockResolvedValue([]);
        await electron.invoke('bulkwhois:lookup', ['a.com'], ['com']);
        expect(invokeMock).toHaveBeenCalledWith('bulk_whois_lookup', expect.object_with({ domains: ['a.com'] }));
    });

    test('maps fs:readFile', async () => {
        invokeMock.mockResolvedValue('content');
        const res = await electron.invoke('fs:readFile', 'path/to/file');
        expect(invokeMock).toHaveBeenCalledWith('fs_read_file', { path: 'path/to/file' });
        expect(res).toBe('content');
    });

    test('maps settings:load', async () => {
        invokeMock.mockResolvedValueOnce('path'); // app_get_user_data_path
        invokeMock.mockResolvedValueOnce('{"key":"val"}'); // settings_load
        const res = await electron.invoke('settings:load');
        expect(res.settings.key).toBe('val');
        expect(res.userDataPath).toBe('path');
    });
});

// Helper for matching objects with subset of keys
expect.extend({
    object_with(received, argument) {
        const pass = this.equals(received, expect.objectContaining(argument));
        return {
            pass,
            message: () => `expected ${received} to contain ${argument}`
        };
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            object_with(argument: any): R;
        }
    }
}

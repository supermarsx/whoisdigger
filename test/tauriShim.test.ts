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
        save: jest.fn(),
        open: jest.fn()
    },
    window: {
        getCurrentWindow: () => ({
            minimize: jest.fn(),
            toggleMaximize: jest.fn(),
            close: jest.fn(),
            show: jest.fn()
        })
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
        expect(invokeMock).toHaveBeenCalledWith('bulk_whois_lookup', {
            domains: ['a.com'],
            concurrency: 4,
            timeoutMs: 5000,
        });
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

    test('maps availability:check', async () => {
        invokeMock.mockResolvedValue('available');
        const res = await electron.invoke('availability:check', 'some text');
        expect(invokeMock).toHaveBeenCalledWith('availability_check', { text: 'some text' });
        expect(res).toBe('available');
    });

    test('maps availability:params', async () => {
        const mockParams = { registrar: 'ABC' };
        invokeMock.mockResolvedValue(mockParams);
        const res = await electron.invoke('availability:params', 'test.com', 'available', 'raw text');
        expect(invokeMock).toHaveBeenCalledWith('availability_params', { 
            domain: 'test.com', 
            status: 'available', 
            text: 'raw text' 
        });
        expect(res).toEqual(mockParams);
    });

    test('maps shell:openPath', async () => {
        await electron.invoke('shell:openPath', 'some/path');
        expect(invokeMock).toHaveBeenCalledWith('shell_open_path', { path: 'some/path' });
    });

    test('maps bulkwhois:export', async () => {
        const results = { domain: ['a.com'], status: ['available'] };
        const options = { filetype: 'csv' };
        const saveMock = (window as any).__TAURI__.dialog.save;
        saveMock.mockResolvedValue('path/to/save.csv');
        
        await electron.invoke('bulkwhois:export', results, options);
        expect(saveMock).toHaveBeenCalled();
        expect(invokeMock).toHaveBeenCalledWith('bulk_whois_export', { 
            results, 
            options, 
            path: 'path/to/save.csv' 
        });
    });

    test('handles unhandled invoke channel', async () => {
        const res = await electron.invoke('non-existent-channel');
        expect(res).toBeNull();
    });

    test('handles backend errors', async () => {
        invokeMock.mockRejectedValue(new Error('Backend failure'));
        await expect(electron.invoke('singlewhois:lookup', 'err.com')).rejects.toThrow('Backend failure');
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

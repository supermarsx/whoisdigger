/**
 * Tests for darkmode renderer (app/ts/renderer/darkmode.ts)
 * @jest-environment jsdom
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

let mockSettings: Record<string, any> = {};
let mockSaveSettings: jest.Mock;

jest.mock('../app/ts/renderer/settings-renderer.js', () => ({
  get settings() {
    return mockSettings;
  },
  saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
}));

describe('darkmode', () => {
  let matchMediaListeners: Record<string, Function>;
  let matchMediaMatches: boolean;

  beforeEach(() => {
    jest.resetModules();
    matchMediaListeners = {};
    matchMediaMatches = false;
    mockSaveSettings = jest.fn().mockResolvedValue(undefined);
    mockSettings = {
      theme: {
        darkMode: false,
        followSystem: false,
      },
    };

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: matchMediaMatches,
        media: query,
        addEventListener: jest.fn((event: string, cb: Function) => {
          matchMediaListeners[event] = cb;
        }),
        removeEventListener: jest.fn(),
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    document.documentElement.removeAttribute('data-theme');
  });

  function loadModule(): void {
    require('../app/ts/renderer/darkmode.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('applies light theme by default', () => {
    loadModule();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies dark theme when darkMode is true', () => {
    mockSettings.theme.darkMode = true;
    loadModule();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('follows system preference when followSystem is true', () => {
    mockSettings.theme.followSystem = true;
    matchMediaMatches = true;
    loadModule();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('responds to settings-loaded event', () => {
    loadModule();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    mockSettings.theme.darkMode = true;
    window.dispatchEvent(new Event('settings-loaded'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('updates theme on dark mode select change', () => {
    const select = document.createElement('select');
    select.id = 'theme.darkMode';
    document.body.appendChild(select);

    loadModule();

    // Need to set the value and fire change
    const option = document.createElement('option');
    option.value = 'true';
    select.appendChild(option);
    select.value = 'true';
    select.dispatchEvent(new Event('change'));

    expect(mockSettings.theme.darkMode).toBe(true);
    expect(mockSaveSettings).toHaveBeenCalled();
  });

  it('updates theme on system select change', () => {
    const select = document.createElement('select');
    select.id = 'theme.followSystem';
    document.body.appendChild(select);

    loadModule();

    const option = document.createElement('option');
    option.value = 'true';
    select.appendChild(option);
    select.value = 'true';
    select.dispatchEvent(new Event('change'));

    expect(mockSettings.theme.followSystem).toBe(true);
    expect(mockSaveSettings).toHaveBeenCalled();
  });
});

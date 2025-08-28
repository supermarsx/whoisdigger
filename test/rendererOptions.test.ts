/** @jest-environment jsdom */

let jQuery: typeof import('jquery');
let settingsModule: any;
const mockInvoke = jest.fn();
jest.setTimeout(10000);

const mockSaveSettings = jest.fn().mockResolvedValue('SAVED');

jest.mock('../app/ts/renderer/settings-renderer', () => {
  const actual = jest.requireActual('../app/ts/renderer/settings-renderer');
  return { ...actual, saveSettings: mockSaveSettings };
});

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <div id="settingsEntry">
      <div class="field">
        <select id="appSettings.theme.darkMode">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
        <span class="result-icon"></span>
      </div>
    </div>
    <div id="settings-not-loaded" class="is-hidden"></div>
    <div id="settingsMainContainer" class="current"></div>
    <div id="contents-container"></div>
    <button id="settingsBackToTop"></button>
    <button id="settingsGoToBottom"></button>
    <button id="openDataFolder"></button>
    <button id="reloadApp"></button>
    <table id="opTable"></table>
    <input id="opSearch" />
    <div id="opSearchNoResults"></div>
  `;
  (window as any).electron = {
    getBaseDir: () => Promise.resolve(__dirname),
    invoke: mockInvoke,
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    openDataDir: () => mockInvoke('settings:open-data-dir'),
    startStats: (...args: any[]) => mockInvoke('stats:start', ...args),
    refreshStats: (...args: any[]) => mockInvoke('stats:refresh', ...args),
    stopStats: (...args: any[]) => mockInvoke('stats:stop', ...args),
    getStats: (...args: any[]) => mockInvoke('stats:get', ...args),
    path: { join: (...args: string[]) => require('path').join(...args) },
    readdir: jest.fn(async () => []),
    stat: jest.fn(async () => ({ size: 0, mtime: new Date(), atime: new Date() })),
    access: jest.fn(async () => {}),
    exists: jest.fn(async () => false),
    unlink: jest.fn(async () => {}),
    watch: jest.fn(async () => ({ close: () => {} }))
  };
  mockInvoke.mockClear();
  mockSaveSettings.mockClear();
});

test('changing setting updates configuration', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  settingsModule = require('../app/ts/renderer/settings-renderer');
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const { settings } = settingsModule;

  await new Promise((r) => setTimeout(r, 0));

  const selectEl = document.getElementById('appSettings.theme.darkMode') as HTMLSelectElement;
  selectEl.value = 'true';
  selectEl.dispatchEvent(new Event('change', { bubbles: true }));

  await Promise.resolve();
  expect(settings.theme.darkMode).toBe(true);
  expect(mockSaveSettings).toHaveBeenCalled();
});

test('reloadApp invokes ipcRenderer', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  await new Promise((r) => setTimeout(r, 0));
  expect(mockInvoke).toHaveBeenCalledWith('stats:start', expect.any(String), expect.any(String));

  mockInvoke.mockClear();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#reloadApp').trigger('click');

  await Promise.resolve();

  expect(mockInvoke).toHaveBeenCalledWith('app:reload');
});

test('openDataFolder invokes settings:open-data-dir', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#openDataFolder').trigger('click');

  await Promise.resolve();

  expect(mockInvoke).toHaveBeenCalledWith('settings:open-data-dir');
});

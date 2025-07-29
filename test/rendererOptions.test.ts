/** @jest-environment jsdom */

let jQuery: typeof import('jquery');
let settingsModule: any;
const invokeMock = jest.fn();
jest.setTimeout(10000);

const saveSettingsMock = jest.fn().mockResolvedValue('SAVED');

jest.mock('../app/ts/renderer/settings-renderer', () => {
  const actual = jest.requireActual('../app/ts/renderer/settings-renderer');
  return { ...actual, saveSettings: saveSettingsMock };
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
    <button id="openDataFolder"></button>
    <button id="reloadApp"></button>
    <table id="opTable"></table>
    <input id="opSearch" />
    <div id="opSearchNoResults"></div>
  `;
  (window as any).electron = {
    getBaseDir: () => Promise.resolve(__dirname),
    invoke: invokeMock,
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    openDataDir: () => invokeMock('settings:open-data-dir'),
    startStats: (...args: any[]) => invokeMock('stats:start', ...args),
    refreshStats: (...args: any[]) => invokeMock('stats:refresh', ...args),
    stopStats: (...args: any[]) => invokeMock('stats:stop', ...args),
    getStats: (...args: any[]) => invokeMock('stats:get', ...args),
    path: { join: (...args: string[]) => require('path').join(...args) },
    readdir: jest.fn(async () => []),
    stat: jest.fn(async () => ({ size: 0, mtime: new Date(), atime: new Date() })),
    access: jest.fn(async () => {}),
    exists: jest.fn(async () => false),
    unlink: jest.fn(async () => {}),
    watch: jest.fn(async () => ({ close: () => {} }))
  };
  invokeMock.mockClear();
  saveSettingsMock.mockClear();
});

test('changing setting updates configuration', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  settingsModule = require('../app/ts/renderer/settings-renderer');
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const { settings } = settingsModule;

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#appSettings\\.theme\\.darkMode').val('true').trigger('change');

  await Promise.resolve();
  expect(settings.theme.darkMode).toBe(true);
  expect(saveSettingsMock).toHaveBeenCalled();
});

test('reloadApp invokes ipcRenderer', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  await new Promise((r) => setTimeout(r, 0));
  expect(invokeMock).toHaveBeenCalledWith('stats:start', expect.any(String), expect.any(String));

  invokeMock.mockClear();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#reloadApp').trigger('click');

  await Promise.resolve();

  expect(invokeMock).toHaveBeenCalledWith('app:reload');
});

test('openDataFolder invokes settings:open-data-dir', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#openDataFolder').trigger('click');

  await Promise.resolve();

  expect(invokeMock).toHaveBeenCalledWith('settings:open-data-dir');
});

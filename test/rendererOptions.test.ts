/** @jest-environment jsdom */

let jQuery: typeof import('../app/vendor/jquery.js');
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
    <div id="opEntry">
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
    openDataDir: () => invokeMock('app:open-data-dir'),
    startSettingsStats: (...args: any[]) => invokeMock('settings:start-stats', ...args),
    refreshSettingsStats: (...args: any[]) => invokeMock('settings:refresh-stats', ...args),
    stopSettingsStats: (...args: any[]) => invokeMock('settings:stop-stats', ...args),
    getSettingsStats: (...args: any[]) => invokeMock('settings:get-stats', ...args),
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
  jQuery = require('../app/vendor/jquery.js');
  (window as any).$ = (window as any).jQuery = jQuery;
  settingsModule = require('../app/ts/renderer/settings-renderer');
  require('../app/ts/renderer/settings');
  jQuery.ready();
  const { settings } = settingsModule;

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#appSettings\\.theme\\.darkMode').val('true').trigger('change');

  await Promise.resolve();
  expect(settings.theme.darkMode).toBe(true);
  expect(saveSettingsMock).toHaveBeenCalled();
});

test('reloadApp invokes ipcRenderer', async () => {
  jQuery = require('../app/vendor/jquery.js');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  jQuery.ready();

  await new Promise((r) => setTimeout(r, 0));
  expect(invokeMock).toHaveBeenCalledWith(
    'settings:start-stats',
    expect.any(String),
    expect.any(String)
  );

  invokeMock.mockClear();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#reloadApp').trigger('click');

  await Promise.resolve();

  expect(invokeMock).toHaveBeenCalledWith('app:reload');
});

test('openDataFolder invokes app:open-data-dir', async () => {
  jQuery = require('../app/vendor/jquery.js');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  jQuery.ready();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#openDataFolder').trigger('click');

  await Promise.resolve();

  expect(invokeMock).toHaveBeenCalledWith('app:open-data-dir');
});

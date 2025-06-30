/** @jest-environment jsdom */

let jQuery: typeof import('../app/vendor/jquery.js');
let settingsModule: any;
const invokeMock = jest.fn();
const openPathMock = jest.fn();

jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn()
  }))
}));

const saveSettingsMock = jest.fn().mockResolvedValue('SAVED');

jest.mock('../app/ts/common/settings', () => {
  const actual = jest.requireActual('../app/ts/common/settings');
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
    invoke: invokeMock,
    openPath: openPathMock,
    send: jest.fn(),
    on: jest.fn(),
    path: { join: (...args: string[]) => require('path').join(...args) },
    readdir: jest.fn(async () => []),
    stat: jest.fn(async () => ({ size: 0, mtime: new Date(), atime: new Date() })),
    access: jest.fn(async () => {}),
    exists: jest.fn(async () => false),
    unlink: jest.fn(async () => {}),
    watch: jest.fn(async () => ({ close: () => {} }))
  };
  invokeMock.mockClear();
  openPathMock.mockClear();
  saveSettingsMock.mockClear();
});

test('changing setting updates configuration', async () => {
  jQuery = require('../app/vendor/jquery.js');
  (window as any).$ = (window as any).jQuery = jQuery;
  settingsModule = require('../app/ts/common/settings');
  require('../app/ts/renderer/options');
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
  require('../app/ts/renderer/options');
  jQuery.ready();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#reloadApp').trigger('click');

  await Promise.resolve();

  expect(invokeMock).toHaveBeenCalledWith('app:reload');
});

test('openDataFolder calls shell.openPath', async () => {
  jQuery = require('../app/vendor/jquery.js');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/options');
  jQuery.ready();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#openDataFolder').trigger('click');

  await Promise.resolve();

  expect(openPathMock).toHaveBeenCalled();
});

/** @jest-environment jsdom */

let jQuery: typeof import('jquery');
let settingsModule: any;
jest.setTimeout(10000);

const mockSaveSettings = jest.fn().mockResolvedValue('SAVED');

jest.mock('../app/ts/renderer/settings-renderer', () => {
  const actual = jest.requireActual('../app/ts/renderer/settings-renderer');
  return { ...actual, saveSettings: mockSaveSettings };
});

const mockStatsStart = jest.fn().mockResolvedValue('watcher-1');
const mockStatsRefresh = jest.fn();
const mockStatsStop = jest.fn();
const mockOpenDataDir = jest.fn();
const mockReload = jest.fn();
const listenHandlers: Record<string, Function> = {};

jest.mock('../app/ts/common/bridge/profiles.js', () => ({
  profilesList: jest.fn().mockResolvedValue([]),
  profilesCreate: jest.fn(),
  profilesRename: jest.fn(),
  profilesDelete: jest.fn(),
  profilesSetCurrent: jest.fn(),
  profilesExport: jest.fn(),
  profilesImport: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/stats.js', () => ({
  statsStart: mockStatsStart,
  statsRefresh: mockStatsRefresh,
  statsStop: mockStatsStop,
}));

jest.mock('../app/ts/common/bridge/settings.js', () => ({
  configExport: jest.fn(),
  configImport: jest.fn(),
  configDelete: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/dialogs.js', () => ({
  openDbFileDialog: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/history.js', () => ({
  historyMerge: jest.fn(),
  cacheMerge: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/ai.js', () => ({
  aiDownloadModel: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/core.js', () => ({
  listen: jest.fn((event: string, cb: Function) => {
    listenHandlers[event] = cb;
  }),
  unlisten: jest.fn(),
}));

jest.mock('../app/ts/common/bridge/filesystem.js', () => ({
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
    stat: jest.fn().mockResolvedValue({ size: 0, mtime: new Date(), atime: new Date() }),
    readdir: jest.fn().mockResolvedValue([]),
    unlink: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
  path: {
    join: (...args: string[]) => require('path').join(...args),
    basename: (p: string) => require('path').basename(p),
  },
  watch: jest.fn().mockResolvedValue({ close: () => {} }),
}));

jest.mock('../app/ts/common/bridge/app.js', () => ({
  app: {
    getBaseDir: jest.fn().mockResolvedValue(__dirname),
    getUserDataPath: jest.fn().mockResolvedValue(__dirname),
    openDataDir: mockOpenDataDir,
    openPath: jest.fn(),
    minimize: jest.fn(),
    toggleMaximize: jest.fn(),
    close: jest.fn(),
    reload: mockReload,
    toggleDevtools: jest.fn(),
  },
}));

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

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
  mockStatsStart.mockClear();
  mockStatsRefresh.mockClear();
  mockStatsStop.mockClear();
  mockOpenDataDir.mockClear();
  mockReload.mockClear();
  mockSaveSettings.mockClear();
  Object.keys(listenHandlers).forEach((k) => delete listenHandlers[k]);
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

test('reloadApp calls app.reload', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  await new Promise((r) => setTimeout(r, 0));
  expect(mockStatsStart).toHaveBeenCalled();

  mockStatsStart.mockClear();

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#reloadApp').trigger('click');

  await Promise.resolve();

  expect(mockReload).toHaveBeenCalled();
});

test('openDataFolder calls app.openDataDir', async () => {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  require('../app/ts/renderer/settings');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  await new Promise((r) => setTimeout(r, 0));

  jQuery('#openDataFolder').trigger('click');

  await Promise.resolve();

  expect(mockOpenDataDir).toHaveBeenCalled();
});

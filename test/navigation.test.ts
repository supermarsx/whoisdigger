/** @jest-environment jsdom */

import jQuery from 'jquery';

const mockDebug = jest.fn();
jest.mock('../app/ts/common/logger.ts', () => ({
  debugFactory: () => mockDebug
}));

const mockToggleDevtools = jest.fn();
const mockListen = jest.fn();
const mockMinimize = jest.fn();
const mockClose = jest.fn();

jest.mock('../app/ts/common/bridge/app.js', () => ({
  app: {
    toggleDevtools: mockToggleDevtools,
    minimize: mockMinimize,
    close: mockClose,
    getBaseDir: jest.fn().mockResolvedValue('/tmp'),
  },
}));

jest.mock('../app/ts/common/bridge/core.js', () => ({
  listen: mockListen,
}));

jest.mock('../app/ts/renderer/settings-renderer.js', () => ({
  settings: {},
  saveSettings: jest.fn(),
  loadSettings: jest.fn(),
  customSettingsLoaded: false,
  getUserDataPath: () => '/tmp',
}));

jest.mock('../app/ts/renderer/settings.js', () => ({
  populateInputs: jest.fn(),
}));

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<button id="navButtonDevtools"></button>';
  (window as any).$ = (window as any).jQuery = jQuery;
  mockDebug.mockClear();
  mockToggleDevtools.mockClear();
  mockListen.mockClear();
});

afterEach(() => {
  jest.resetModules();
  delete (window as any).$;
  delete (window as any).jQuery;
});

function loadModule(): void {
  require('../app/ts/renderer/navigation');
}

test('drop event prevents default and logs debug', () => {
  loadModule();
  const dropEvent = new Event('drop');
  dropEvent.preventDefault = jest.fn();

  document.dispatchEvent(dropEvent);

  expect(dropEvent.preventDefault).toHaveBeenCalled();
  expect(mockDebug).toHaveBeenCalledWith('Preventing drag and drop redirect');
});

test('dragover event prevents default', () => {
  loadModule();
  const dragEvent = new Event('dragover');
  dragEvent.preventDefault = jest.fn();

  document.dispatchEvent(dragEvent);

  expect(dragEvent.preventDefault).toHaveBeenCalled();
});

test('devtools button triggers toggleDevtools', () => {
  loadModule();

  jQuery('#navButtonDevtools').trigger('click');

  expect(mockToggleDevtools).toHaveBeenCalled();
  expect(mockDebug).toHaveBeenCalledWith('#navButtonDevtools was clicked');
});

/** @jest-environment jsdom */

import '../test/electronMock';

let jQuery: typeof import('jquery');

const listeners: Array<(e: { matches: boolean }) => void> = [];
let systemPref = true;

function setSystemPref(value: boolean): void {
  systemPref = value;
  listeners.forEach((cb) => cb({ matches: value }));
}

beforeEach(() => {
  jest.resetModules();
  listeners.length = 0;
  systemPref = true;
  (window as any).matchMedia = jest.fn().mockImplementation(() => ({
    get matches() {
      return systemPref;
    },
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb);
    },
    removeEventListener: jest.fn()
  }));
  document.documentElement.removeAttribute('data-theme');
});

async function loadDarkmode(): Promise<any> {
  jQuery = require('jquery');
  (window as any).$ = (window as any).jQuery = jQuery;
  const settingsModule = require('../app/ts/common/settings');
  settingsModule.settings.theme.followSystem = true;
  settingsModule.settings.theme.darkMode = false;
  require('../app/ts/renderer/darkmode');
  jQuery.ready();
  await new Promise((r) => setTimeout(r, 0));
  return settingsModule;
}

test('followSystem applies system dark preference', async () => {
  await loadDarkmode();
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});

test('changes when system preference updates', async () => {
  await loadDarkmode();
  setSystemPref(false);
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
});

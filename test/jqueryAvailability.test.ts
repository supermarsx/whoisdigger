/** @jest-environment jsdom */

import '../test/electronMock';

jest.mock('@electron/remote', () => ({
  app: { getPath: jest.fn(() => '') }
}));

jest.mock('../app/ts/renderer/index', () => ({}));
jest.mock('../app/ts/renderer/navigation', () => ({}));

jest.mock('../app/ts/common/settings', () => ({
  loadSettings: jest.fn(() => ({
    'custom.configuration': { filepath: 'test.json', load: false, save: false },
    'app.window.navigation': {
      developerTools: false,
      extendedCollapsed: false,
      enableExtendedMenu: false
    }
  }))
}));

import jQuery from 'jquery';

describe('renderer jQuery availability', () => {
  test('global $ references jQuery function', () => {
    expect((window as any).$).toBeUndefined();
    require('../app/ts/renderer');
    expect((window as any).$).toBe(jQuery);
    expect((window as any).jQuery).toBe(jQuery);
    expect(typeof (window as any).$).toBe('function');
  });
});

/** @jest-environment jsdom */

import Handlebars from '../app/vendor/handlebars.runtime.js';

const mockGetBaseDir = jest.fn().mockResolvedValue('/base');
const mockReadFile = jest.fn();
const mockJoin = jest.fn((...args: string[]) => args.join('/'));

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
}));

jest.mock('../app/ts/common/tauriBridge.js', () => ({
  app: { getBaseDir: mockGetBaseDir },
  fs: { readFile: mockReadFile },
  path: { join: mockJoin },
}));

describe('i18n loader', () => {
  beforeEach(() => {
    mockGetBaseDir.mockClear();
    mockReadFile.mockReset();
    mockJoin.mockClear();
    mockJoin.mockImplementation((...args: string[]) => args.join('/'));
  });

  test('loads translations and registers helper', async () => {
    mockReadFile.mockResolvedValue('{"hello":"world"}');
    const {
      loadTranslations,
      registerTranslationHelpers,
      _getTranslations
    } = require('../app/ts/renderer/i18n');

    await loadTranslations('en');
    registerTranslationHelpers();

    expect(_getTranslations()).toEqual({ hello: 'world' });
    expect(Handlebars.helpers.t('hello')).toBe('world');
  });

  test('falls back to navigator language when setting missing', async () => {
    mockReadFile.mockResolvedValue('{"hello":"bonjour"}');
    Object.defineProperty(window.navigator, 'language', {
      value: 'fr-FR',
      configurable: true
    });
    const { loadTranslations, _getTranslations } = require('../app/ts/renderer/i18n');

    await loadTranslations();

    const args = mockJoin.mock.calls[0];
    expect(args[args.length - 1]).toBe('fr.json');
    expect(_getTranslations()).toEqual({ hello: 'bonjour' });
  });
});

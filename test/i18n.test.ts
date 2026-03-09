/** @jest-environment jsdom */

import Handlebars from '../app/vendor/handlebars.runtime.js';

const mockI18nLoad = jest.fn();

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
}));

jest.mock('../app/ts/common/bridge/app.js', () => ({
  i18nLoad: mockI18nLoad,
}));

describe('i18n loader', () => {
  beforeEach(() => {
    mockI18nLoad.mockReset();
  });

  test('loads translations and registers helper', async () => {
    mockI18nLoad.mockResolvedValue({ hello: 'world' });
    const {
      loadTranslations,
      registerTranslationHelpers,
      _getTranslations
    } = require('../app/ts/renderer/services/i18n');

    await loadTranslations('en');
    registerTranslationHelpers();

    expect(_getTranslations()).toEqual({ hello: 'world' });
    expect(Handlebars.helpers.t('hello')).toBe('world');
  });

  test('falls back to navigator language when setting missing', async () => {
    mockI18nLoad.mockResolvedValue({ hello: 'bonjour' });
    Object.defineProperty(window.navigator, 'language', {
      value: 'fr-FR',
      configurable: true
    });
    const { loadTranslations, _getTranslations } = require('../app/ts/renderer/services/i18n');

    await loadTranslations();

    expect(mockI18nLoad).toHaveBeenCalledWith('fr');
    expect(_getTranslations()).toEqual({ hello: 'bonjour' });
  });
});

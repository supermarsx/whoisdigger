/** @jest-environment jsdom */

import Handlebars from '../app/vendor/handlebars.runtime.js';

const loadMock = jest.fn();

describe('i18n loader', () => {
  beforeEach(() => {
    loadMock.mockReset();
    (window as any).electron = {
      loadTranslations: loadMock
    };
  });

  test('loads translations and registers helper', async () => {
    loadMock.mockResolvedValue({ hello: 'world' });
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
});

/** @jest-environment jsdom */

jest.mock('fs', () => ({
  promises: { readFile: jest.fn() }
}));

import Handlebars from 'handlebars/runtime';

const readFileMock = require('fs').promises.readFile as jest.Mock;

describe('i18n loader', () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  test('loads translations and registers helper', async () => {
    readFileMock.mockResolvedValue('{"hello":"world"}');
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

/** @jest-environment jsdom */

jest.mock('fs', () => ({
  promises: { readFile: jest.fn() }
}));

import Handlebars from '../app/vendor/handlebars.runtime.js';

const readFileMock = require('fs').promises.readFile as jest.Mock;

describe('i18n loader', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    (window as any).electron = {
      readFile: readFileMock,
      path: { join: (...args: string[]) => require('path').join(...args) }
    };
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

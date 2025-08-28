/** @jest-environment jsdom */

import Handlebars from '../app/vendor/handlebars.runtime.js';

const invokeMock = jest.fn();
const joinMock = jest.fn(async (...args: string[]) => args.join('/'));

describe('i18n loader', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    joinMock.mockReset();
    (window as any).electron = {
      invoke: invokeMock,
      path: { join: joinMock }
    };
  });

  test('loads translations and registers helper', async () => {
    invokeMock.mockResolvedValue('{"hello":"world"}');
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
    invokeMock.mockResolvedValue('{"hello":"bonjour"}');
    Object.defineProperty(window.navigator, 'language', {
      value: 'fr-FR',
      configurable: true
    });
    const { loadTranslations, _getTranslations } = require('../app/ts/renderer/i18n');

    await loadTranslations();

    const args = joinMock.mock.calls[0];
    expect(args[args.length - 1]).toBe('fr.json');
    expect(_getTranslations()).toEqual({ hello: 'bonjour' });
  });
});

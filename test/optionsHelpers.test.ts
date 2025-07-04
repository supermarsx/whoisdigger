/** @jest-environment jsdom */

(window as any).electron = { getBaseDir: () => Promise.resolve(__dirname) };

import { _test } from '../app/ts/renderer/settings';
import { settings } from '../app/ts/renderer/settings-renderer';
import appDefaults from '../app/ts/appsettings';

const { getValue, setValue, parseValue, getDefault } = _test;

describe('options helper functions', () => {
  test('getValue returns nested value', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.timeout = 1234;
    expect(getValue('lookupGeneral.timeout')).toBe(1234);
    Object.assign(settings, backup);
  });

  test('setValue writes to nested path', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    setValue('lookupProxy.enable', true);
    expect(settings.lookupProxy.enable).toBe(true);
    setValue('custom.nested.value', 7);
    expect((settings as any).custom.nested.value).toBe(7);
    delete (settings as any).custom;
    Object.assign(settings, backup);
  });

  test('parseValue converts primitives', () => {
    expect(parseValue('true')).toBe(true);
    expect(parseValue('false')).toBe(false);
    expect(parseValue('42')).toBe(42);
    expect(parseValue('-3.5')).toBe(-3.5);
    expect(parseValue('text')).toBe('text');
  });

  test('getDefault returns default setting', () => {
    expect(getDefault('lookupGeneral.timeout')).toBe(appDefaults.settings.lookupGeneral.timeout);
  });
});

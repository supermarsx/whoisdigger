import '../test/electronMock';
import { mergeDefaults, settings } from '../app/ts/renderer/settings-renderer';

describe('mergeDefaults', () => {
  test('overrides array values', () => {
    const partial = { lookupProxy: { list: ['p1', 'p2'] } };
    const merged = mergeDefaults(partial);
    const expected = JSON.parse(JSON.stringify(settings));
    expected.lookupProxy.list = ['p1', 'p2'];
    expect(merged).toEqual(expected);
  });

  test('merges nested objects', () => {
    const partial = { lookupGeneral: { timeout: 5000, follow: 5 }, lookupProxy: { enable: true } };
    const merged = mergeDefaults(partial);
    const expected = JSON.parse(JSON.stringify(settings));
    expected.lookupGeneral.timeout = 5000;
    expected.lookupGeneral.follow = 5;
    expected.lookupProxy.enable = true;
    expect(merged).toEqual(expected);
  });

  test('throws TypeError on invalid types', () => {
    const partial: any = { lookupGeneral: { follow: 'not-number' } };
    expect(() => mergeDefaults(partial)).toThrow(TypeError);
  });
});

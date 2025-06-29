import { resetObj } from '../app/ts/common/resetObject';

describe('resetObj', () => {
  test('modifying returned object does not mutate original', () => {
    const original = { a: 1, b: { c: 2 } };
    const copy = resetObj(original);
    (copy.b as any).c = 3;
    expect(original).toEqual({ a: 1, b: { c: 2 } });
  });

  test('default invocation returns a deep copy of {}', () => {
    const first = resetObj();
    expect(first).toEqual({});
    (first as any).x = 1;
    const second = resetObj();
    expect(second).toEqual({});
    expect(second).not.toBe(first);
  });

  test('preserves Date instances', () => {
    const original = { d: new Date('2020-01-01T00:00:00Z') };
    const copy = resetObj(original);
    expect(copy).toEqual(original);
    expect(Object.prototype.toString.call(copy.d)).toBe('[object Date]');
  });
});

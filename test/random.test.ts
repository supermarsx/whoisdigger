import { randomInt } from '../app/ts/utils/random';

describe('randomInt', () => {
  test('returns values within bounds for standard range', () => {
    const orig = Math.random;
    const seq = [0, 0.3, 0.6, 0.9, 0.99];
    let i = 0;
    Math.random = () => seq[i++];
    const results = seq.map(() => randomInt(1, 5));
    Math.random = orig;
    const within = results.every((v) => v >= 1 && v <= 5);
    expect(within).toBe(true);
  });

  test('swaps parameters when min is greater than max', () => {
    const orig = Math.random;
    Math.random = () => 0.75;
    const result = randomInt(10, 5);
    Math.random = orig;
    expect(result).toBeGreaterThanOrEqual(5);
    expect(result).toBeLessThanOrEqual(10);
  });

  test('handles negative ranges', () => {
    const orig = Math.random;
    Math.random = () => 0;
    const low = randomInt(-5, -1);
    Math.random = () => 0.999;
    const high = randomInt(-5, -1);
    Math.random = orig;
    expect(low).toBe(-5);
    expect(high).toBe(-1);
  });
});

import { processLines } from '../app/ts/common/tools';

describe('processLines', () => {
  test('applies prefix, suffix and dedupe', () => {
    const opts = { prefix: 'pre-', suffix: '-suf', dedupe: true };
    const result = processLines(['a', 'a', 'b'], opts);
    expect(result).toEqual(['pre-a-suf', 'pre-b-suf']);
  });

  test('sorts and trims spaces', () => {
    const opts = { sort: 'asc', trimSpaces: true };
    const result = processLines([' c', 'b', 'a '], opts);
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

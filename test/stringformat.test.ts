const { formatString } = require('../app/ts/common/stringformat');

describe('stringformat', () => {
  test('replaces numbered placeholders', () => {
    expect(formatString('Hello {0} {1}', 'a', 'b')).toBe('Hello a b');
  });

  test('handles repeated placeholders', () => {
    expect(formatString('Repeat {0} {0}', 'x')).toBe('Repeat x x');
  });

  test('leaves unused placeholders unchanged', () => {
    expect(formatString('Unused {2} {0}', 'a')).toBe('Unused {2} a');
  });
});

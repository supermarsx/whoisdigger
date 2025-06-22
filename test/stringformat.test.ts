require('../app/ts/common/stringformat');

describe('stringformat', () => {
  test('replaces numbered placeholders', () => {
    expect('Hello {0} {1}'.format('a', 'b')).toBe('Hello a b');
  });

  test('handles repeated placeholders', () => {
    expect('Repeat {0} {0}'.format('x')).toBe('Repeat x x');
  });

  test('leaves unused placeholders unchanged', () => {
    expect('Unused {2} {0}'.format('a')).toBe('Unused {2} a');
  });
});

const { escapeRegex } = require('../app/ts/utils/regex');

describe('escapeRegex', () => {
  test('escapes special regex characters', () => {
    const input = 'a+b*c?d.e^f$g(h)i|j[k]l\\m';
    const escaped = escapeRegex(input);
    const regex = new RegExp(escaped, 'g');
    expect(regex.test(input)).toBe(true);
  });
});

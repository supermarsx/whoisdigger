import { lineCount } from '../app/ts/common/lineHelper';

describe('lineHelper', () => {
  test('lineCount handles Windows newline sequences', () => {
    const text = 'a\r\nb\r\nc\r\n';
    expect(lineCount(text, '\r\n')).toBe(3);
  });
});

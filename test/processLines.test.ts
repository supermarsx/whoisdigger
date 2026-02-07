/**
 * Tests for app/ts/common/tools.ts — processLines
 */
import { processLines, ProcessOptions } from '../app/ts/common/tools.js';

describe('processLines', () => {
  const lines = ['apple', 'banana', 'cherry', '', 'banana'];

  test('returns a copy when no options are set', () => {
    const result = processLines(lines, {});
    expect(result).toEqual(lines);
    expect(result).not.toBe(lines); // must be a copy
  });

  test('applies prefix', () => {
    const result = processLines(['a', 'b'], { prefix: 'www.' });
    expect(result).toEqual(['www.a', 'www.b']);
  });

  test('applies suffix', () => {
    const result = processLines(['a', 'b'], { suffix: '.com' });
    expect(result).toEqual(['a.com', 'b.com']);
  });

  test('applies both prefix and suffix', () => {
    const result = processLines(['domain'], { prefix: 'www.', suffix: '.com' });
    expect(result).toEqual(['www.domain.com']);
  });

  test('applies affix', () => {
    const result = processLines(['test'], { affix: { prefix: '<', suffix: '>' } });
    expect(result).toEqual(['<test>']);
  });

  test('trims spaces', () => {
    const result = processLines(['  a  ', ' b '], { trimSpaces: true });
    expect(result).toEqual(['a', 'b']);
  });

  test('deletes blank lines', () => {
    const result = processLines(['a', '', '  ', 'b'], { deleteBlankLines: true });
    expect(result).toEqual(['a', 'b']);
  });

  test('deduplicates lines', () => {
    const result = processLines(['a', 'b', 'a', 'c', 'b'], { dedupe: true });
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('sorts ascending', () => {
    const result = processLines(['cherry', 'apple', 'banana'], { sort: 'asc' });
    expect(result).toEqual(['apple', 'banana', 'cherry']);
  });

  test('sorts descending', () => {
    const result = processLines(['cherry', 'apple', 'banana'], { sort: 'desc' });
    expect(result).toEqual(['cherry', 'banana', 'apple']);
  });

  test('sorts randomly (shuffles)', () => {
    // Just verify it returns same elements, not necessarily same order
    const input = ['a', 'b', 'c', 'd', 'e'];
    const result = processLines(input, { sort: 'random' });
    expect(result.sort()).toEqual([...input].sort());
  });

  test('applies operations in correct order', () => {
    // prefix → suffix → trim → deleteBlank → dedupe → sort
    const result = processLines(
      ['  b  ', '  a  ', '  b  ', '', '  c  '],
      {
        trimSpaces: true,
        deleteBlankLines: true,
        dedupe: true,
        sort: 'asc'
      }
    );
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('handles empty input', () => {
    expect(processLines([], {})).toEqual([]);
    expect(processLines([], { prefix: 'x', sort: 'asc', dedupe: true })).toEqual([]);
  });

  test('handles single line', () => {
    const result = processLines(['only'], { prefix: '>', suffix: '<' });
    expect(result).toEqual(['>only<']);
  });

  test('prefix and suffix with special characters', () => {
    const result = processLines(['test'], { prefix: '$.', suffix: '()' });
    expect(result).toEqual(['$.test()']);
  });
});

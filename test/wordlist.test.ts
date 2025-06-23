import fs from 'fs';
import path from 'path';
import * as wordlist from '../app/ts/common/wordlist';

describe('wordlist tools', () => {
  test('concatenateFiles merges files', async () => {
    const p1 = path.join(__dirname, 'tmp1.txt');
    const p2 = path.join(__dirname, 'tmp2.txt');
    fs.writeFileSync(p1, 'a\nb');
    fs.writeFileSync(p2, 'c\nd');
    const lines = await wordlist.concatenateFiles(p1, p2);
    expect(lines).toEqual(['a', 'b', 'c', 'd']);
    fs.unlinkSync(p1);
    fs.unlinkSync(p2);
  });

  test('splitFiles by lines', async () => {
    const p = path.join(__dirname, 'tmp3.txt');
    fs.writeFileSync(p, 'a\nb\nc\nd\ne');
    const result = await wordlist.splitFiles([p], { lines: 2 });
    expect(result[0]).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    fs.unlinkSync(p);
  });

  test('addPrefixSuffix adds both', () => {
    expect(wordlist.addPrefixSuffix(['x'], 'pre-', '-post')).toEqual(['pre-x-post']);
  });

  test('sortAlphanumericReverse sorts descending', () => {
    expect(wordlist.sortAlphanumericReverse(['b', 'a', 'c'])).toEqual(['c', 'b', 'a']);
  });

  test('deduplicateLines removes duplicates', () => {
    expect(wordlist.deduplicateLines(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  test('rot13 converts letters', () => {
    expect(wordlist.rot13(['abc'])[0]).toBe('nop');
  });

  test('replaceRegex works', () => {
    expect(wordlist.replaceRegex(['foo123'], /\d+/, 'X')).toEqual(['fooX']);
  });
});

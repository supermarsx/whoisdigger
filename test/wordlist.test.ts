import fs from 'fs';
import path from 'path';
import {
  concatFiles,
  splitFiles,
  addPrefix,
  addSuffix,
  addAffix,
  sortLines,
  sortLinesReverse,
  dedupeLines,
  replaceString,
  replaceRegex,
  toLowerCaseLines
} from '../app/ts/common/wordlist';

describe('wordlist tools', () => {
  test('concatFiles joins files', async () => {
    const p1 = path.join(__dirname, 'f1.txt');
    const p2 = path.join(__dirname, 'f2.txt');
    fs.writeFileSync(p1, 'a\nb');
    fs.writeFileSync(p2, 'c\nd');
    const lines = await concatFiles(p1, p2);
    expect(lines).toEqual(['a', 'b', 'c', 'd']);
    fs.unlinkSync(p1);
    fs.unlinkSync(p2);
  });

  test('splitFiles by lines', async () => {
    const p = path.join(__dirname, 'f3.txt');
    fs.writeFileSync(p, 'a\nb\nc\nd');
    const parts = await splitFiles({ files: [p], maxLines: 2 });
    expect(parts).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ]);
    fs.unlinkSync(p);
  });

  test('prefix and suffix', () => {
    const lines = ['x', 'y'];
    expect(addPrefix(lines, 'pre')).toEqual(['prex', 'prey']);
    expect(addSuffix(lines, 's')).toEqual(['xs', 'ys']);
    expect(addAffix(lines, 'p', 's')).toEqual(['pxs', 'pys']);
  });

  test('sorting helpers', () => {
    const lines = ['b2', 'a10', 'a2'];
    expect(sortLines(lines)).toEqual(['a2', 'a10', 'b2']);
    expect(sortLinesReverse(lines)).toEqual(['b2', 'a10', 'a2']);
  });

  test('dedupeLines removes duplicates', () => {
    const lines = ['a', 'b', 'a'];
    expect(dedupeLines(lines)).toEqual(['a', 'b']);
  });

  test('replace helpers', () => {
    const lines = ['foo', 'barfoo'];
    expect(replaceString(lines, 'foo', 'baz')).toEqual(['baz', 'barbaz']);
    expect(replaceRegex(lines, /fo+/g, 'x')).toEqual(['x', 'barx']);
  });

  test('case conversion', () => {
    const lines = ['A', 'b'];
    expect(toLowerCaseLines(lines)).toEqual(['a', 'b']);
  });
});

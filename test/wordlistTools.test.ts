import fs from 'fs';
import path from 'path';
import { splitFiles, shuffleLines, dedupeLines } from '../app/ts/common/wordlist';

describe('wordlist tools advanced', () => {
  const sample = path.join(__dirname, '..', 'sample_lists', '3letter_alpha.list');

  test('splitFiles divides sample list by maxLines', async () => {
    const parts: string[][] = [];
    for await (const p of splitFiles({ files: [sample], maxLines: 5 })) {
      parts.push(p);
    }
    expect(parts).toEqual([
      ['aaq', 'bha', 'dyv', 'fed', 'gxp'],
      ['irq', 'jee', 'nvi', 'onr', 'xgh'],
      ['xkd', 'yme']
    ]);
  });

  test('splitFiles respects pattern option', async () => {
    const p = path.join(__dirname, 'pattern.txt');
    fs.writeFileSync(p, 'a\n---\nb\nc\n---\nd');
    const parts: string[][] = [];
    for await (const part of splitFiles({ files: [p], pattern: /^---$/ })) {
      parts.push(part);
    }
    expect(parts).toEqual([['a'], ['b', 'c'], ['d']]);
    fs.unlinkSync(p);
  });

  test('splitFiles splits by maxSize bytes', async () => {
    const p = path.join(__dirname, 'size.txt');
    fs.writeFileSync(p, 'a\nbb\nccc');
    const parts: string[][] = [];
    for await (const part of splitFiles({ files: [p], maxSize: 4 })) {
      parts.push(part);
    }
    expect(parts).toEqual([['a'], ['bb'], ['ccc']]);
    fs.unlinkSync(p);
  });

  test('splitFiles uses maxLines over maxSize when both set', async () => {
    const p = path.join(__dirname, 'pref.txt');
    fs.writeFileSync(p, '1\n2\n3\n4\n5\n6');
    const parts: string[][] = [];
    for await (const part of splitFiles({ files: [p], maxLines: 2, maxSize: 100 })) {
      parts.push(part);
    }
    expect(parts).toEqual([
      ['1', '2'],
      ['3', '4'],
      ['5', '6']
    ]);
    fs.unlinkSync(p);
  });

  test('splitFiles with no files returns empty array', async () => {
    const parts: string[][] = [];
    for await (const part of splitFiles({ files: [] })) {
      parts.push(part);
    }
    expect(parts).toEqual([[]]);
  });

  test('shuffleLines deterministic order with mocked random', () => {
    const orig = Math.random;
    const seq = [0.1, 0.8, 0.2];
    let i = 0;
    Math.random = () => seq[i++];
    const result = shuffleLines(['a', 'b', 'c', 'd']);
    Math.random = orig;
    expect(result).toEqual(['b', 'd', 'c', 'a']);
  });

  test('shuffleLines handles empty array', () => {
    expect(shuffleLines([])).toEqual([]);
  });

  test('dedupeLines removes duplicates and keeps order', () => {
    expect(dedupeLines(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  test('dedupeLines with empty array returns empty', () => {
    expect(dedupeLines([])).toEqual([]);
  });
});

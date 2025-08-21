import { createReadStream } from 'fs';
import readline from 'readline';
import { randomInt } from '../utils/random.js';
import { escapeRegex } from '../utils/regex.js';

export async function* readLines(file: string): AsyncGenerator<string> {
  const stream = createReadStream(file, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      yield line;
    }
  } finally {
    rl.close();
    stream.close();
  }
}
export async function* concatFiles(...files: string[]): AsyncGenerator<string> {
  for (const file of files) {
    yield* readLines(file);
  }
}

export interface SplitOptions {
  files: string[];
  maxSize?: number;
  maxLines?: number;
  pattern?: RegExp;
}

export async function* splitFiles(options: SplitOptions): AsyncGenerator<string[]> {
  if (options.files.length === 0) {
    yield [];
    return;
  }

  const lineGen = concatFiles(...options.files);

  if (options.pattern) {
    let current: string[] = [];
    for await (const line of lineGen) {
      if (options.pattern.test(line)) {
        yield current;
        current = [];
      } else {
        current.push(line);
      }
    }
    if (current.length) yield current;
    return;
  }

  if (options.maxLines !== undefined) {
    let current: string[] = [];
    for await (const line of lineGen) {
      current.push(line);
      if (current.length === options.maxLines) {
        yield current;
        current = [];
      }
    }
    if (current.length) yield current;
    return;
  }

  if (options.maxSize !== undefined) {
    let current: string[] = [];
    let size = 0;
    for await (const line of lineGen) {
      const lnSize = Buffer.byteLength(line + '\n');
      if (size + lnSize > options.maxSize && current.length) {
        yield current;
        current = [];
        size = 0;
      }
      current.push(line);
      size += lnSize;
    }
    if (current.length) yield current;
    return;
  }

  const lines: string[] = [];
  for await (const line of lineGen) {
    lines.push(line);
  }
  yield lines;
}

export function addPrefix(lines: string[], prefix: string): string[] {
  return lines.map((l) => prefix + l);
}

export function addSuffix(lines: string[], suffix: string): string[] {
  return lines.map((l) => l + suffix);
}

export function addAffix(lines: string[], prefix: string, suffix: string): string[] {
  return addSuffix(addPrefix(lines, prefix), suffix);
}

export function sortLines(lines: string[]): string[] {
  return [...lines].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function sortLinesReverse(lines: string[]): string[] {
  return sortLines(lines).reverse();
}

export function shuffleLines(lines: string[]): string[] {
  const arr = [...lines];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function trimSpaces(lines: string[]): string[] {
  return lines.map((l) => l.trim());
}

export function deleteSpaces(lines: string[]): string[] {
  return lines.map((l) => l.replace(/\s+/g, ''));
}

export function deleteBlankLines(lines: string[]): string[] {
  return lines.filter((l) => l.trim() !== '');
}

export function trimNonAlnum(lines: string[]): string[] {
  return lines.map((l) => l.replace(/^\W+|\W+$/g, ''));
}

export function deleteNonAlnum(lines: string[]): string[] {
  return lines.map((l) => l.replace(/\W+/g, ''));
}

export function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((l) => {
    if (seen.has(l)) return false;
    seen.add(l);
    return true;
  });
}

export function deleteRegex(lines: string[], pattern: RegExp): string[] {
  return lines.filter((l) => !pattern.test(l));
}

export function trimRegex(lines: string[], pattern: RegExp): string[] {
  return lines.map((l) => l.replace(pattern, ''));
}

export function deleteLinesContaining(lines: string[], str: string): string[] {
  return lines.filter((l) => !l.includes(str));
}

export function deleteString(lines: string[], str: string): string[] {
  const regex = new RegExp(escapeRegex(str), 'g');
  return lines.map((l) => l.replace(regex, ''));
}

export function toLowerCaseLines(lines: string[]): string[] {
  return lines.map((l) => l.toLowerCase());
}

export function toUpperCaseLines(lines: string[]): string[] {
  return lines.map((l) => l.toUpperCase());
}

export function rot13Lines(lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    })
  );
}

const leetMap: Record<string, string> = {
  a: '4',
  e: '3',
  i: '1',
  o: '0',
  s: '5',
  t: '7'
};

export function toLeetSpeakLines(lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(/[aeiost]/gi, (c) => {
      const mapped = leetMap[c.toLowerCase()];
      return c === c.toLowerCase() ? mapped : mapped.toUpperCase();
    })
  );
}

export function toUtf8Lines(lines: string[]): string[] {
  return lines.map((l) => Buffer.from(l).toString('utf8'));
}

export function replaceString(lines: string[], search: string, replacement: string): string[] {
  const regex = new RegExp(escapeRegex(search), 'g');
  return lines.map((l) => l.replace(regex, replacement));
}

export function replaceRegex(lines: string[], pattern: RegExp, replacement: string): string[] {
  return lines.map((l) => l.replace(pattern, replacement));
}

const WordlistTools = {
  readLines,
  concatFiles,
  splitFiles,
  addPrefix,
  addSuffix,
  addAffix,
  sortLines,
  sortLinesReverse,
  shuffleLines,
  trimSpaces,
  deleteSpaces,
  deleteBlankLines,
  trimNonAlnum,
  deleteNonAlnum,
  dedupeLines,
  deleteRegex,
  trimRegex,
  deleteLinesContaining,
  deleteString,
  toLowerCaseLines,
  toUpperCaseLines,
  rot13Lines,
  toLeetSpeakLines,
  toUtf8Lines,
  replaceString,
  replaceRegex
};

export default WordlistTools;

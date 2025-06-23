import fs from 'fs';

export function concatFiles(...files: string[]): string[] {
  const lines: string[] = [];
  for (const file of files) {
    const data = fs.readFileSync(file, 'utf8');
    lines.push(...data.split(/\r?\n/));
  }
  return lines;
}

export interface SplitOptions {
  files: string[];
  maxSize?: number;
  maxLines?: number;
  pattern?: RegExp;
}

export function splitFiles(options: SplitOptions): string[][] {
  const lines = concatFiles(...options.files);
  const result: string[][] = [];

  if (options.pattern) {
    let current: string[] = [];
    for (const line of lines) {
      if (options.pattern.test(line)) {
        result.push(current);
        current = [];
      } else {
        current.push(line);
      }
    }
    if (current.length) result.push(current);
    return result;
  }

  if (options.maxLines !== undefined) {
    for (let i = 0; i < lines.length; i += options.maxLines) {
      result.push(lines.slice(i, i + options.maxLines));
    }
    return result;
  }

  if (options.maxSize !== undefined) {
    let current: string[] = [];
    let size = 0;
    for (const line of lines) {
      const lnSize = Buffer.byteLength(line + '\n');
      if (size + lnSize > options.maxSize && current.length) {
        result.push(current);
        current = [];
        size = 0;
      }
      current.push(line);
      size += lnSize;
    }
    if (current.length) result.push(current);
    return result;
  }

  return [lines];
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
    const j = Math.floor(Math.random() * (i + 1));
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
  const regex = new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
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
  t: '7',
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
  const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  return lines.map((l) => l.replace(regex, replacement));
}

export function replaceRegex(lines: string[], pattern: RegExp, replacement: string): string[] {
  return lines.map((l) => l.replace(pattern, replacement));
}

const WordlistTools = {
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
  replaceRegex,
};

export default WordlistTools;

import fs from 'fs';

export async function concatenateFiles(...files: string[]): Promise<string[]> {
  const lines: string[] = [];
  for (const file of files) {
    const data = await fs.promises.readFile(file, 'utf8');
    lines.push(...data.split(/\r?\n/));
  }
  return lines;
}

export async function splitFiles(
  files: string[],
  opts: { lines?: number; size?: number; regex?: RegExp }
): Promise<string[][][]> {
  const result: string[][][] = [];
  for (const file of files) {
    const contents = await fs.promises.readFile(file, 'utf8');
    const lines = contents.split(/\r?\n/);
    let parts: string[][] = [];
    if (opts.lines) {
      for (let i = 0; i < lines.length; i += opts.lines) {
        parts.push(lines.slice(i, i + opts.lines));
      }
    } else if (opts.size) {
      let chunk: string[] = [];
      let bytes = 0;
      for (const line of lines) {
        const lineBytes = Buffer.byteLength(line + '\n', 'utf8');
        if (bytes + lineBytes > opts.size && chunk.length) {
          parts.push(chunk);
          chunk = [];
          bytes = 0;
        }
        chunk.push(line);
        bytes += lineBytes;
      }
      if (chunk.length) parts.push(chunk);
    } else if (opts.regex) {
      const segments = contents.split(opts.regex);
      parts = segments.map((seg) => seg.split(/\r?\n/).filter((l) => l !== ''));
    }
    result.push(parts);
  }
  return result;
}

export function addPrefix(lines: string[], prefix: string): string[] {
  return lines.map((l) => prefix + l);
}

export function addSuffix(lines: string[], suffix: string): string[] {
  return lines.map((l) => l + suffix);
}

export function addPrefixSuffix(lines: string[], prefix: string, suffix: string): string[] {
  return addSuffix(addPrefix(lines, prefix), suffix);
}

export function sortAlphanumeric(lines: string[]): string[] {
  return [...lines].sort((a, b) => a.localeCompare(b));
}

export function sortAlphanumericReverse(lines: string[]): string[] {
  return [...lines].sort((a, b) => b.localeCompare(a));
}

export function randomizeLines(lines: string[]): string[] {
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

export function trimNonAlphanumeric(lines: string[]): string[] {
  return lines.map((l) => l.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''));
}

export function deleteNonAlphanumeric(lines: string[]): string[] {
  return lines.map((l) => l.replace(/[^a-zA-Z0-9]/g, ''));
}

export function deduplicateLines(lines: string[]): string[] {
  return Array.from(new Set(lines));
}

export function trimByRegex(lines: string[], regex: RegExp): string[] {
  return lines.map((l) => l.replace(regex, ''));
}

export function deleteByRegex(lines: string[], regex: RegExp): string[] {
  return lines.filter((l) => !regex.test(l));
}

export function deleteLinesContaining(lines: string[], text: string): string[] {
  return lines.filter((l) => !l.includes(text));
}

export function removeString(lines: string[], text: string): string[] {
  return lines.map((l) => l.replaceAll(text, ''));
}

export function toLowerCaseLines(lines: string[]): string[] {
  return lines.map((l) => l.toLowerCase());
}

export function toUpperCaseLines(lines: string[]): string[] {
  return lines.map((l) => l.toUpperCase());
}

export function rot13(lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    })
  );
}

const leetMap: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' };
export function toLeetSpeak(lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(/[aeiost]/gi, (c) => {
      const rep = leetMap[c.toLowerCase()] || c;
      return c === c.toLowerCase() ? rep : rep.toUpperCase();
    })
  );
}

export function toUtf8(lines: string[]): string[] {
  return lines.map((l) => Buffer.from(l, 'utf8').toString('utf8'));
}

export function replaceString(lines: string[], search: string, replacement: string): string[] {
  return lines.map((l) => l.split(search).join(replacement));
}

export function replaceRegex(lines: string[], regex: RegExp, replacement: string): string[] {
  return lines.map((l) => l.replace(regex, replacement));
}

export default {
  concatenateFiles,
  splitFiles,
  addPrefix,
  addSuffix,
  addPrefixSuffix,
  sortAlphanumeric,
  sortAlphanumericReverse,
  randomizeLines,
  trimSpaces,
  deleteSpaces,
  deleteBlankLines,
  trimNonAlphanumeric,
  deleteNonAlphanumeric,
  deduplicateLines,
  trimByRegex,
  deleteByRegex,
  deleteLinesContaining,
  removeString,
  toLowerCaseLines,
  toUpperCaseLines,
  rot13,
  toLeetSpeak,
  toUtf8,
  replaceString,
  replaceRegex
};

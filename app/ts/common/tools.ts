import * as WordlistTools from './wordlist';

export interface ProcessOptions {
  prefix?: string;
  suffix?: string;
  affix?: { prefix: string; suffix: string };
  sort?: 'asc' | 'desc' | 'random';
  trimSpaces?: boolean;
  deleteBlankLines?: boolean;
  dedupe?: boolean;
}

/*
  processLines
    Apply wordlist tool operations sequentially
  parameters
    lines (array) - lines to process
    options (object) - processing options
*/
export function processLines(lines: string[], options: ProcessOptions): string[] {
  let result = [...lines];

  if (options.prefix) result = WordlistTools.addPrefix(result, options.prefix);
  if (options.suffix) result = WordlistTools.addSuffix(result, options.suffix);
  if (options.affix)
    result = WordlistTools.addAffix(
      result,
      options.affix.prefix,
      options.affix.suffix
    );

  if (options.trimSpaces) result = WordlistTools.trimSpaces(result);
  if (options.deleteBlankLines) result = WordlistTools.deleteBlankLines(result);
  if (options.dedupe) result = WordlistTools.dedupeLines(result);

  switch (options.sort) {
    case 'asc':
      result = WordlistTools.sortLines(result);
      break;
    case 'desc':
      result = WordlistTools.sortLinesReverse(result);
      break;
    case 'random':
      result = WordlistTools.shuffleLines(result);
      break;
  }

  return result;
}

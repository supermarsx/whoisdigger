export interface ProcessOptions {
  prefix?: string;
  suffix?: string;
  affix?: { prefix: string; suffix: string };
  sort?: 'asc' | 'desc' | 'random';
  trimSpaces?: boolean;
  deleteBlankLines?: boolean;
  dedupe?: boolean;
}

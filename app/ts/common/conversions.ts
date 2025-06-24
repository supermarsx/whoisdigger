/*
  byteToHumanFileSize
    Convert bytes size to human readable format
  parameters
    bytes (integer) - bytes to convert
    si (boolean) - use standard international units
 */
export function byteToHumanFileSize(bytes: number, si = true): string {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) return bytes + ' B';

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);

  return `${bytes.toFixed(1)} ${units[u]}`;
}

/*
  msToHumanTime
    Convert a given milliseconds to string in human readable format
  parameters
    duration (integer) - milliseconds to convert
 */
export interface ParsedTime {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  weeks: number;
  months: number;
  years: number;
}

export function msToHumanTime(duration = 0): string {
  if (!Number.isFinite(duration) || duration <= 0) return '-';

  const parsedTime: ParsedTime = {
    milliseconds: Math.floor(duration % 1000),
    seconds: Math.floor(duration / 1000) % 60,
    minutes: Math.floor(duration / (1000 * 60)) % 60,
    hours: Math.floor(duration / (1000 * 60 * 60)) % 24,
    days: Math.floor(duration / (1000 * 60 * 60 * 24)) % 7,
    weeks: Math.floor(duration / (1000 * 60 * 60 * 24 * 7)) % 4,
    months: Math.floor(duration / (1000 * 60 * 60 * 24 * 7 * 4)) % 12,
    years:
      Math.floor(duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)) % 10
  };
  let time = '';

  time = compileString(parsedTime);

  return time;
}

/*
  compileString
    Compiles parsed time to a human readable string
  parameters
    parsedTime
 */
function compileString(parsedTime: ParsedTime): string {
  let compiledString = '';
  const suffixes: Record<keyof ParsedTime, string> = {
    milliseconds: 'ms',
    seconds: 's',
    minutes: 'm',
    hours: 'h',
    days: 'd',
    weeks: 'w',
    months: 'M',
    years: 'Y'
  };
  const orderedSuffixes: Array<keyof ParsedTime> = [];

  for (const unorderedParcel in parsedTime)
    orderedSuffixes.unshift(unorderedParcel as keyof ParsedTime);

  for (const parcel of orderedSuffixes)
    if (parsedTime[parcel] > 0) compiledString += `${parsedTime[parcel]} ${suffixes[parcel]} `;

  return compiledString.trim();
}

/*
  getDate
    Parse a date from a source string
  parameters
    date (string/date) - Date or String to be date parsed
 */
export function getDate(date: string | Date | undefined | null | boolean): string | undefined {
  if (date === null || date === '' || date === false || date === undefined) return undefined;

  const timestamp = Date.parse(date as string);
  if (Number.isNaN(timestamp)) return undefined;

  const parsed = new Date(timestamp).toUTCString();
  if (parsed === 'Invalid Date') return undefined;

  return parsed;
}

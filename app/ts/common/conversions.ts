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
  const BASE = 10;

  if (parseInt(String(duration), BASE) <= 0 || isNaN(parseInt(String(duration), BASE))) return '-';

  const parsedTime: ParsedTime = {
    milliseconds: parseInt((duration % 1000).toString(), BASE),
    seconds: parseInt((duration / 1000).toFixed(6) as unknown as string, BASE) % 60,
    minutes: parseInt((duration / (1000 * 60)).toFixed(6) as unknown as string, BASE) % 60,
    hours: parseInt((duration / (1000 * 60 * 60)).toFixed(6) as unknown as string, BASE) % 24,
    days: parseInt((duration / (1000 * 60 * 60 * 24)).toFixed(6) as unknown as string, BASE) % 7,
    weeks:
      parseInt((duration / (1000 * 60 * 60 * 24 * 7)).toFixed(6) as unknown as string, BASE) % 4,
    months:
      parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4)).toFixed(6) as unknown as string, BASE) %
      12,
    years:
      parseInt(
        (duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)).toFixed(6) as unknown as string,
        BASE
      ) % 10
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

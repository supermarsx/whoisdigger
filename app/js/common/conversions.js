// jshint esversion: 8, -W030

/*
  byteToHumanFileSize
    Convert bytes size to human readable format
  parameters
    bytes (integer) - bytes to convert
    si (boolean) - use standard international units
 */
function byteToHumanFileSize(bytes, si = true) {
  var thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) return bytes + ' B';

  var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var u = -1;

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
function msToHumanTime(duration = 0) {
  const BASE = 10;

  if (parseInt(duration, BASE) <= 0 || isNaN(parseInt(duration, BASE))) return '-';

  var parsedTime = {
      milliseconds: parseInt((duration % 1000), BASE),
      seconds: parseInt((duration / 1000).toFixed(6) % 60, BASE),
      minutes: parseInt((duration / (1000 * 60)).toFixed(6) % 60, BASE),
      hours: parseInt((duration / (1000 * 60 * 60)).toFixed(6) % 24, BASE),
      days: parseInt((duration / (1000 * 60 * 60 * 24)).toFixed(6) % 7, BASE),
      weeks: parseInt((duration / (1000 * 60 * 60 * 24 * 7)).toFixed(6) % 4, BASE),
      months: parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4)).toFixed(6) % 12, BASE),
      years: parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)).toFixed(6) % 10, BASE)
    },
    time = '';

  time = compileString(parsedTime);

  return time;
}

/*
  compileString
    Compiles parsed time to a human readable string
  parameters
    parsedTime
 */
function compileString(parsedTime) {
  var compiledString = '',
    suffixes = { // String suffixes by name
      milliseconds: 'ms',
      seconds: 's',
      minutes: 'm',
      hours: 'h',
      days: 'd',
      weeks: 'w',
      months: 'M',
      years: 'Y'
    },
    orderedSuffixes = [];

  for (var unorderedParcel in parsedTime) orderedSuffixes.unshift(unorderedParcel);

  for (var parcel in orderedSuffixes)
    if (parsedTime[orderedSuffixes[parcel]] > 0)
      compiledString += `${parsedTime[orderedSuffixes[parcel]]} ${suffixes[orderedSuffixes[parcel]]} `;

  return compiledString;
}

/*
  getDate
    Parse a date from a source string
  parameters
    date (string/date) - Date or String to be date parsed
 */
function getDate(date) {
  if (date === null || date === '' || date === false) return undefined;
  var parsed = new Date(Date.parse(date)).toUTCString();
  if (parsed == 'Invalid Date') return date;

  return parsed;
}

module.exports = {
  byteToHumanFileSize: byteToHumanFileSize,
  msToHumanTime: msToHumanTime,
  getDate: getDate
};

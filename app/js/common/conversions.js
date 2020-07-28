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
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}

/*
  msToHumanTime
    Convert a given milliseconds to string in human readable format
  parameters
    duration (integer) - milliseconds to convert
 */
function msToHumanTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = parseInt((duration / 1000).toFixed(6) % 60),
    minutes = parseInt((duration / (1000 * 60)).toFixed(6) % 60),
    hours = parseInt((duration / (1000 * 60 * 60)).toFixed(6) % 24),
    days = parseInt((duration / (1000 * 60 * 60 * 24)).toFixed(6) % 7),
    weeks = parseInt((duration / (1000 * 60 * 60 * 24 * 7)).toFixed(6) % 4),
    months = parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4)).toFixed(6) % 12),
    years = parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)).toFixed(6) % 10);
  var time = '';

  (years < 1) ? true: time += months + 'Y';
  (months < 1) ? true: time += months + 'M';
  (weeks < 1) ? true: time += weeks + 'w';
  (days < 1) ? true: time += days + 'd';
  (hours < 1) ? true: time += hours + 'h';
  (minutes < 1) ? true: time += minutes + 'm';
  (seconds < 1) ? true: time += seconds + 's';
  (milliseconds < 125) ? true: time += milliseconds + 'ms';

  (duration >= 0) ? true: time = '-';

  return time;
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
  if (parsed == 'Invalid Date') {
    return date;
  } else {
    return parsed;
  }
}

module.exports = {
  byteToHumanFileSize: byteToHumanFileSize,
  msToHumanTime: msToHumanTime,
  getDate: getDate
};

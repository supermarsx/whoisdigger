// Human readable file size
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

// Convert milliseconds to String, human readable
function msToHumanTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = parseInt((duration / 1000).toFixed(6) % 60),
    minutes = parseInt((duration / (1000 * 60)).toFixed(6) % 60),
    hours = parseInt((duration / (1000 * 60 * 60)).toFixed(6) % 24),
    days = parseInt((duration / (1000 * 60 * 60 * 24)).toFixed(6) % 7),
    weeks = parseInt((duration / (1000 * 60 * 60 * 24 * 7)).toFixed(6) % 4),
    months = parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4)).toFixed(6) % 12);
    years = parseInt((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)).toFixed(6) % 10);
  var time = '';

  (years < 1) ? true : time += months + 'Y';
  (months < 1) ? true : time += months + 'M';
  (weeks < 1) ? true : time += weeks + 'w';
  (days < 1) ? true : time += days + 'd';
  (hours < 1) ? true : time += hours + 'h';
  (minutes < 1) ? true : time += minutes + 'm';
  (seconds < 1) ? true : time += seconds + 's';
  (milliseconds < 125) ? true : time += milliseconds + 'ms';

  (duration >= 0) ? true : time = '-';


  return time;
}

// Convert milliseconds to String, hum readable
function msToHumanTimeLegacy(milliseconds) {

  function numberEnding(number) {
    return (number > 1) ? 's' : '';
  }

  var temp = Math.floor(milliseconds / 1000);
  var years = Math.floor(temp / 31536000);
  if (years) {
    return years + ' year' + numberEnding(years);
  }
  //TODO: Months! Maybe weeks?
  var days = Math.floor((temp %= 31536000) / 86400);
  if (days) {
    return days + ' day' + numberEnding(days);
  }
  var hours = Math.floor((temp %= 86400) / 3600);
  if (hours) {
    return hours + ' hour' + numberEnding(hours);
  }
  var minutes = Math.floor((temp %= 3600) / 60);
  if (minutes) {
    return minutes + ' minute' + numberEnding(minutes);
  }
  var seconds = temp % 60;
  if (seconds) {
    return seconds + ' second' + numberEnding(seconds);
  }
  return 'less than a second'; //'just now' //or other string you like;
}

module.exports = {
  byteToHumanFileSize: byteToHumanFileSize,
  msToHumanTime: msToHumanTime,
  msToHumanTimeLegacy: msToHumanTimeLegacy
};

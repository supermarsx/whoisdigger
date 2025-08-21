import { byteToHumanFileSize, msToHumanTime, getDate } from '../app/ts/common/conversions';

describe('conversions', () => {
  test('byteToHumanFileSize converts bytes', () => {
    expect(byteToHumanFileSize(1024)).toBe('1.0 kB');
  });

  test('msToHumanTime converts milliseconds', () => {
    expect(msToHumanTime(62000)).toBe('1 m 2 s');
  });

  test('msToHumanTime converts hours', () => {
    expect(msToHumanTime(3600000)).toBe('1 h');
  });

  test('msToHumanTime converts one day', () => {
    expect(msToHumanTime(86400000)).toBe('1 d');
  });

  test('msToHumanTime converts one week', () => {
    expect(msToHumanTime(604800000)).toBe('1 w');
  });

  test('msToHumanTime converts one month', () => {
    expect(msToHumanTime(2419200000)).toBe('1 M');
  });

  test('msToHumanTime converts one year', () => {
    expect(msToHumanTime(29030400000)).toBe('1 Y');
  });

  test('msToHumanTime converts days', () => {
    expect(msToHumanTime(172800000)).toBe('2 d');
  });

  test('msToHumanTime rolls over years after ten', () => {
    const yearMs = 1000 * 60 * 60 * 24 * 7 * 4 * 12;
    expect(msToHumanTime(yearMs * 11)).toBe('1 Y');
  });

  test('msToHumanTime handles sub-second values', () => {
    expect(msToHumanTime(500)).toBe('500 ms');
  });

  test('msToHumanTime converts one millisecond', () => {
    expect(msToHumanTime(1)).toBe('1 ms');
  });

  test('msToHumanTime converts one second', () => {
    expect(msToHumanTime(1000)).toBe('1 s');
  });

  test('msToHumanTime converts one minute', () => {
    expect(msToHumanTime(60000)).toBe('1 m');
  });

  test('msToHumanTime handles combined durations', () => {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 4 * week;
    const year = 12 * month;
    const duration = year + 2 * month + 3 * week + 4 * day + 5 * hour + 6 * minute + 7 * 1000 + 8;

    expect(msToHumanTime(duration)).toBe('1 Y 2 M 3 w 4 d 5 h 6 m 7 s 8 ms');
  });

  test("msToHumanTime returns '-' for zero duration", () => {
    expect(msToHumanTime(0)).toBe('-');
  });

  test("msToHumanTime returns '-' for negative duration", () => {
    expect(msToHumanTime(-1000)).toBe('-');
  });

  test("msToHumanTime returns '-' for NaN", () => {
    expect(msToHumanTime(NaN)).toBe('-');
  });

  test("msToHumanTime returns '-' for Infinity", () => {
    expect(msToHumanTime(Infinity)).toBe('-');
  });

  test('getDate parses valid dates', () => {
    const date = new Date('2020-01-01T00:00:00Z');
    expect(getDate(date)).toBe(date.toUTCString());
  });

  test('getDate returns undefined for invalid dates', () => {
    expect(getDate('invalid')).toBeUndefined();
  });

  test('getDate returns undefined for empty input', () => {
    expect(getDate('')).toBeUndefined();
  });

  test('getDate returns undefined for null', () => {
    expect(getDate(null)).toBeUndefined();
  });
});

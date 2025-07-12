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

  test("msToHumanTime returns '-' for zero duration", () => {
    expect(msToHumanTime(0)).toBe('-');
  });

  test("msToHumanTime returns '-' for negative duration", () => {
    expect(msToHumanTime(-1000)).toBe('-');
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

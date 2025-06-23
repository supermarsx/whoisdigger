import { byteToHumanFileSize, msToHumanTime, getDate } from '../app/ts/common/conversions';

describe('conversions', () => {
  test('byteToHumanFileSize converts bytes', () => {
    expect(byteToHumanFileSize(1024)).toBe('1.0 kB');
  });

  test('msToHumanTime converts milliseconds', () => {
    expect(msToHumanTime(62000)).toBe('1 m 2 s');
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

import { dirnameCompat } from '../app/ts/utils/dirnameCompat';

test('returns a directory path', () => {
  const dir = dirnameCompat();
  expect(typeof dir).toBe('string');
  expect(dir.length).toBeGreaterThan(0);
});

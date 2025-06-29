import path from 'path';
import { dirnameCompat } from '../app/ts/utils/dirnameCompat';

describe('dirnameCompat', () => {
  const originalDirname = (global as any).__dirname;

  afterEach(() => {
    if (originalDirname === undefined) {
      delete (global as any).__dirname;
    } else {
      (global as any).__dirname = originalDirname;
    }
    jest.restoreAllMocks();
  });

  test('returns __dirname when defined', () => {
    (global as any).__dirname = '/tmp/dir';
    const result = dirnameCompat();
    expect(result).toBe('/tmp/dir');
  });

  test('uses module directory when global __dirname is undefined', () => {
    delete (global as any).__dirname;
    const expected = path.resolve(__dirname, '../app/ts/utils');
    const result = dirnameCompat();
    expect(result).toBe(expected);
  });

  test('resolves using provided metaUrl when in ESM context', () => {
    const result = dirnameCompat('file:///tmp/foo/bar.js');
    expect(result).toBe('/tmp/foo');
  });
});

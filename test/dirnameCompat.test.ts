import path from 'path';
import { dirnameCompat } from '../app/ts/utils/dirnameCompat';
import { pathToFileURL, fileURLToPath } from 'url';

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
    const abs = path.join(__dirname, 'sample', 'bar.js');
    const meta = pathToFileURL(abs).href;
    const expected = path.dirname(fileURLToPath(meta));
    const result = dirnameCompat(meta);
    expect(result).toBe(expected);
  });
});

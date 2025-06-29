import { dirnameCompat } from '../app/ts/utils/dirnameCompat';

describe('dirnameCompat', () => {
  const originalDirname = (global as any).__dirname;
  const originalEval = global.eval;

  afterEach(() => {
    if (originalDirname === undefined) {
      delete (global as any).__dirname;
    } else {
      (global as any).__dirname = originalDirname;
    }
    global.eval = originalEval;
  });

  test('returns __dirname when defined', () => {
    (global as any).__dirname = '/tmp/dir';
    const result = dirnameCompat();
    expect(result).toBe('/tmp/dir');
  });

  test('uses import.meta.url when __dirname is undefined', () => {
    delete (global as any).__dirname;
    global.eval = jest.fn(() => 'file:///some/place/file.js');
    const result = dirnameCompat();
    expect(result).toBe('/some/place');
  });

  test('falls back to process.cwd()', () => {
    delete (global as any).__dirname;
    global.eval = jest.fn(() => {
      throw new Error('fail');
    });
    const result = dirnameCompat();
    expect(result).toBe(process.cwd());
  });
});

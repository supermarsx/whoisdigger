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

  test('uses process.cwd() when __dirname is undefined', () => {
    delete (global as any).__dirname;
    const result = dirnameCompat();
    expect(result).toBe(process.cwd());
  });

  test('falls back to process.cwd()', () => {
    delete (global as any).__dirname;
    const result = dirnameCompat();
    expect(result).toBe(process.cwd());
  });

});

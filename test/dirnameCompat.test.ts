import fs from 'fs';
import path from 'path';
import { dirnameCompat } from '../app/ts/utils/dirnameCompat';

describe('dirnameCompat', () => {
  test('returns an existing directory', () => {
    const dir = path.resolve(dirnameCompat());
    expect(fs.existsSync(dir)).toBe(true);
  });
});

import path from 'path';
import { resolveUserDataPath, getUserDataPath } from '../app/ts/common/settings';

describe('resolveUserDataPath', () => {
  const base = getUserDataPath();

  test('keeps relative paths inside user data directory', () => {
    const result = resolveUserDataPath('valid.json');
    expect(result).toBe(path.join(base, 'valid.json'));
  });

  test('sanitizes absolute paths outside user data directory', () => {
    const outside = path.resolve(base, '..', 'abs.json');
    const result = resolveUserDataPath(outside);
    expect(result).toBe(path.join(base, 'abs.json'));
  });

  test('sanitizes traversal attempts', () => {
    const result = resolveUserDataPath(path.join('..', 'trav.json'));
    expect(result).toBe(path.join(base, 'trav.json'));
  });

  test('rejects paths ending with traversal segments', () => {
    expect(() => resolveUserDataPath('..')).toThrow();
    expect(() => resolveUserDataPath(path.join('foo', '..'))).toThrow();
  });
});

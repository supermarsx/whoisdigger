import path from 'path';

export function dirnameCompat() {
  const globalDir = global.__dirname;
  if (typeof globalDir === 'string') {
    return globalDir;
  }
  if (typeof __filename !== 'undefined') {
    return path.dirname(__filename);
  }
  return process.cwd();
}

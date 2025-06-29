import path from 'path';

export function dirnameCompat() {
  const globalDir = global.__dirname;
  if (typeof globalDir === 'string') {
    return globalDir;
  }
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  if (typeof __filename !== 'undefined') {
    return path.dirname(__filename);
  }
  if (process.argv[1]) {
    return path.dirname(process.argv[1]);
  }
  return process.cwd();
}

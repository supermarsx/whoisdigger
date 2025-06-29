import path from 'path';
import { fileURLToPath } from 'url';

export function dirnameCompat(metaUrl) {
  const globalDir = global.__dirname;
  if (typeof globalDir === 'string') {
    return globalDir;
  }
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // Support ESM by using import.meta.url when available
  let url = metaUrl;
  if (!url) {
    try {
      url = Function(
        'return typeof import!=="undefined" && import.meta && import.meta.url ? import.meta.url : undefined'
      )();
    } catch {
      url = undefined;
    }
  }
  if (typeof url === 'string') {
    try {
      return path.dirname(fileURLToPath(url));
    } catch {
      /* ignore */
    }
  }
  if (typeof __filename !== 'undefined') {
    return path.dirname(__filename);
  }
  if (process.mainModule && process.mainModule.filename) {
    return path.dirname(process.mainModule.filename);
  }
  if (process.argv[1]) {
    return path.dirname(process.argv[1]);
  }
  return process.cwd();
}

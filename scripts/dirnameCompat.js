import path from 'path';
import { fileURLToPath } from 'url';

export function dirnameCompat() {
  return typeof __filename !== 'undefined'
    ? path.dirname(__filename)
    : path.dirname(fileURLToPath(import.meta.url));
}

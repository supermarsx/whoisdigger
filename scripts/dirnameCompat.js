import path from 'path';
import { fileURLToPath } from 'url';

export function dirnameCompat() {
  if (typeof __filename !== 'undefined') {
    return path.dirname(__filename);
  }
  try {
    const metaUrl = eval('import.meta.url');
    return path.dirname(fileURLToPath(metaUrl));
  } catch {
    return process.cwd();
  }
}

import path from 'path';
import { fileURLToPath } from 'url';

export function dirnameCompat(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  try {
    const metaUrl = eval('import.meta.url') as string;
    return path.dirname(fileURLToPath(metaUrl));
  } catch {
    return process.cwd();
  }
}

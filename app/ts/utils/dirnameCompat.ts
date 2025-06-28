import path from 'path';
import { fileURLToPath } from 'url';

export function dirnameCompat(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  try {
    // `import.meta.url` is only available in ESM environments. Using
    // `eval` avoids a syntax error when the code is executed as CommonJS.
    const metaUrl = eval('import.meta.url') as string;
    return path.dirname(fileURLToPath(metaUrl));
  } catch {
    // Fallback to current working directory as a last resort.
    return process.cwd();
  }
}

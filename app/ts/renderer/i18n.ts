import { dirnameCompat } from '../utils/dirnameCompat.js';
import path from 'path';

const baseDir = dirnameCompat();
import Handlebars from '../../vendor/handlebars.runtime.js';

const electron = (window as any).electron as
  | {
      fsReadFile?: (file: string, encoding?: string) => Promise<string>;
      pathJoin?: (...parts: string[]) => Promise<string>;
    }
  | undefined;

let translations: Record<string, string> = {};

export async function loadTranslations(lang: string): Promise<void> {
  const file = electron?.pathJoin
    ? await electron.pathJoin(baseDir, '..', 'locales', `${lang}.json`)
    : path.join(baseDir, '..', 'locales', `${lang}.json`);
  try {
    const raw = electron?.fsReadFile
      ? await electron.fsReadFile(file, 'utf8')
      : await require('fs').promises.readFile(file, 'utf8');
    translations = JSON.parse(raw);
  } catch {
    translations = {};
  }
}

export function registerTranslationHelpers(): void {
  Handlebars.registerHelper('t', (key: string) => translations[key] ?? key);
}

export function _getTranslations(): Record<string, string> {
  return translations;
}

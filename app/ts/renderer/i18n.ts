import { dirnameCompat } from '../utils/dirnameCompat.js';

const baseDir = dirnameCompat();
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.i18n');
debug('loaded');

const electron = (window as any).electron as {
  readFile: (p: string, enc?: any) => Promise<any>;
  path: { join: (...args: string[]) => string };
};
let translations: Record<string, string> = {};

export async function loadTranslations(lang: string): Promise<void> {
  const file = electron.path.join(baseDir, '..', 'locales', `${lang}.json`);
  try {
    const raw = await electron.readFile(file, 'utf8');
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

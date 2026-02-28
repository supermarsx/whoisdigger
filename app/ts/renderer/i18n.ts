import { app, fs, path } from '../common/tauriBridge.js';
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.i18n');
debug('loaded');
let translations: Record<string, string> = {};

export async function loadTranslations(lang?: string): Promise<void> {
  const detected = (lang ?? navigator.language ?? 'en').split('-')[0];
  try {
    const base = await app.getBaseDir();
    const p = path.join(base || '', '..', 'locales', `${detected}.json`);
    const raw = await fs.readFile(p);
    translations = JSON.parse(raw) as Record<string, string>;
  } catch {
    try {
      const base = await app.getBaseDir();
      const p = path.join(base || '', '..', 'locales', `en.json`);
      const raw = await fs.readFile(p);
      translations = JSON.parse(raw) as Record<string, string>;
    } catch {
      translations = {};
    }
  }
}

export function registerTranslationHelpers(): void {
  Handlebars.registerHelper('t', (key: string) => translations[key] ?? key);
}

export function _getTranslations(): Record<string, string> {
  return translations;
}

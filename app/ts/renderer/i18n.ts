import { i18nLoad } from '../common/tauriBridge.js';
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.i18n');
debug('loaded');
let translations: Record<string, string> = {};

export async function loadTranslations(lang?: string): Promise<void> {
  const detected = (lang ?? navigator.language ?? 'en').split('-')[0];
  try {
    translations = await i18nLoad(detected);
  } catch {
    // Fallback to English
    try {
      translations = await i18nLoad('en');
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

import fs from 'fs';
import path from 'path';
import { dirnameCompat } from '../utils/dirnameCompat.js';

const baseDir = dirnameCompat();
import Handlebars from '../../vendor/handlebars.runtime.js';

let translations: Record<string, string> = {};

export async function loadTranslations(lang: string): Promise<void> {
  const file = path.join(baseDir, '..', 'locales', `${lang}.json`);
  try {
    const raw = await fs.promises.readFile(file, 'utf8');
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

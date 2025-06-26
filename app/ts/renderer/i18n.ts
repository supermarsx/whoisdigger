import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import Handlebars from 'handlebars/runtime';

let translations: Record<string, string> = {};

export async function loadTranslations(lang: string): Promise<void> {
  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
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

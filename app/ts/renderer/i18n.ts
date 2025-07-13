import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI & {
  path: { join: (...args: string[]) => Promise<string> };
};
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.i18n');
debug('loaded');
let translations: Record<string, string> = {};

export async function loadTranslations(lang: string): Promise<void> {
  const htmlDir = window.location.pathname.split('/').slice(0, -1).join('/');
  const file = await electron.path.join(htmlDir, '..', 'locales', `${lang}.json`);
  try {
    const raw = (await electron.invoke('fs:readFile', file, 'utf8')) as string;
    translations = JSON.parse(raw) as Record<string, string>;
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

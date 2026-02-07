import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI;
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.i18n');
debug('loaded');
let translations: Record<string, string> = {};

export async function loadTranslations(lang?: string): Promise<void> {
  const detected = (lang ?? navigator.language ?? 'en').split('-')[0];
  try {
    const base = (electron as any).getBaseDir ? await (electron as any).getBaseDir() : '';
    const p = await electron.path.join(base || '', '..', 'locales', `${detected}.json`);
    const raw = (await electron.invoke('fs:readFile', p, 'utf8')) as string;
    translations = JSON.parse(raw) as Record<string, string>;
  } catch {
    try {
      const base = (electron as any).getBaseDir ? await (electron as any).getBaseDir() : '';
      const p = await electron.path.join(base || '', '..', 'locales', `en.json`);
      const raw = (await electron.invoke('fs:readFile', p, 'utf8')) as string;
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

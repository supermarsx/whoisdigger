import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI & {
  path: { join: (...args: string[]) => Promise<string> };
};
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.i18n');
debug('loaded');
let translations: Record<string, string> = {};

export async function loadTranslations(lang?: string): Promise<void> {
  const detected = (lang ?? navigator.language ?? 'en').split('-')[0];
  // Build a file: URL relative to the current HTML document and read via IPC
  const base = new URL(window.location.href);
  const localeUrl = new URL(`../locales/${detected}.json`, base).href;
  try {
    const raw = (await electron.invoke('fs:readFile', localeUrl, 'utf8')) as string;
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

import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';
import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI;

const debug = debugFactory('renderer.registerPartials');
debug('loaded');

export async function registerPartials(): Promise<void> {
  const partials: Record<string, any> = {};

  const glob = (import.meta as any).glob || (globalThis as any).__glob;
  if (glob) {
    const modules = glob('../../compiled-templates/*.js', { eager: true });
    for (const [filePath, mod] of Object.entries(modules)) {
      const file = filePath.split('/').pop() as string;
      if (file === 'mainPanel.js') continue;
      const name = file.replace(/\.js$/, '');
      partials[name] = Handlebars.template((mod as any).default || mod);
    }
  } else {
    // In production builds the templates are emitted to disk. When the Vite
    // glob helper isn't available, load them using the filesystem helpers
    // exposed via the preload script.
    const dirUrl = new URL('../../compiled-templates/', import.meta.url);
    // Pass a file URL to main; fs IPC will normalize file: URLs cross‑platform
    const files = (await electron.readdir(dirUrl.href)) as string[];
    for (const file of files) {
      if (!file.endsWith('.js') || file === 'mainPanel.js') continue;
      const spec = await import(/* @vite-ignore */ new URL(file, dirUrl).href);
      const name = file.replace(/\.js$/, '');
      partials[name] = Handlebars.template((spec as any).default || spec);
    }
  }

  for (const [name, template] of Object.entries(partials)) {
    Handlebars.registerPartial(name, template);
  }
}

export default registerPartials;

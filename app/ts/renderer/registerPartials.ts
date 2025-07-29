import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

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
    // In the renderer during development, dynamic imports of Node builtin
    // modules fail because the module loader doesn't resolve them.
    // When running under Electron with nodeIntegration enabled, `require`
    // is available globally. Fall back to using it if present so the
    // renderer can access the filesystem without throwing a module
    // resolution error.
    const fs: typeof import('fs') =
      typeof require === 'function' ? require('fs') : await import('fs');
    const path: typeof import('path') =
      typeof require === 'function' ? require('path') : await import('path');
    const { pathToFileURL, fileURLToPath }: typeof import('url') =
      typeof require === 'function' ? require('url') : await import('url');
    const dir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'compiled-templates'
    );
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.js') || file === 'mainPanel.js') continue;
      const spec = await import(pathToFileURL(path.join(dir, file)).href);
      const name = file.replace(/\.js$/, '');
      partials[name] = Handlebars.template(spec.default || spec);
    }
  }

  for (const [name, template] of Object.entries(partials)) {
    Handlebars.registerPartial(name, template);
  }
}

export default registerPartials;

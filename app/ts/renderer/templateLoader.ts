import { qs } from '../utils/dom.js';
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.templateLoader');
debug('loaded');

export async function loadTemplate(
  selector: string,
  template: string,
  context: any = {},
  fallback?: string
): Promise<void> {
  const el = qs(selector);
  try {
    const module = await import(`../../compiled-templates/${template.replace(/\.hbs$/, '.cjs')}`);
    const precompiled = module.default || module;
    const compiled = Handlebars.template(precompiled);
    const html = compiled(context);
    if (el) el.innerHTML = html;
  } catch (error) {
    debug('failed to load template', error);
    if (fallback && el) {
      el.innerHTML = fallback;
    }
  }
}

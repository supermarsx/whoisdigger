import $ from '../../vendor/jquery.js';
import Handlebars from '../../vendor/handlebars.runtime.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.templateLoader');
debug('loaded');

export async function loadTemplate(
  selector: string,
  template: string,
  context: any = {}
): Promise<void> {
  const module = await import(`../../compiled-templates/${template.replace(/\.hbs$/, '.cjs')}`);
  const precompiled = module.default || module;
  const compiled = Handlebars.template(precompiled);
  const html = compiled(context);
  $(selector).html(html);
}

import $ from '../../vendor/jquery.js';
import Handlebars from '../../vendor/handlebars.runtime.js';

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

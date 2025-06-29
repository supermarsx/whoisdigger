import $ from 'jquery';
const Handlebars = require('handlebars/runtime.js').default;

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

import $ from 'jquery';
import Handlebars from 'handlebars/runtime';

export async function loadTemplate(
  selector: string,
  template: string,
  context: any = {}
): Promise<void> {
  const module = await import(
    `../../compiled-templates/${template.replace(/\.hbs$/, '.js')}`
  );
  const precompiled = module.default || module;
  const compiled = Handlebars.template(precompiled);
  const html = compiled(context);
  $(selector).html(html);
}

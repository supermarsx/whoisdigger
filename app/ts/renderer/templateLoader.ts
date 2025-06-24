import $ from 'jquery';
import Handlebars from 'handlebars';

export async function loadTemplate(selector: string, template: string, context: any = {}): Promise<void> {
  const response = await fetch(`./templates/${template}`);
  const text = await response.text();
  const compiled = Handlebars.compile(text);
  const html = compiled(context);
  $(selector).html(html);
}

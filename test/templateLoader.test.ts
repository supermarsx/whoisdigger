/** @jest-environment jsdom */

import jQuery from 'jquery';

jest.mock('handlebars/runtime.js', () => {
  const compiledFn = jest.fn((ctx: any) => `<span>${ctx.text}</span>`);
  const template = jest.fn(() => compiledFn);
  return { __esModule: true, default: { template } };
});

jest.mock(
  '../app/compiled-templates/mock.cjs',
  () => ({
    __esModule: true,
    default: { name: 'mock' }
  }),
  { virtual: true }
);

import { loadTemplate } from '../app/ts/renderer/templateLoader';
const handlebars = require('handlebars/runtime.js').default;

beforeAll(() => {
  (window as any).$ = (window as any).jQuery = jQuery;
});

describe('loadTemplate', () => {
  test('dynamically loads template and inserts html', async () => {
    document.body.innerHTML = '<div id="target"></div>';
    await loadTemplate('#target', 'mock.hbs', { text: 'hello' });

    expect(handlebars.template).toHaveBeenCalledWith({ name: 'mock' });
    expect(jQuery('#target').html()).toBe('<span>hello</span>');
  });
});

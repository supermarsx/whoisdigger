/** @jest-environment jsdom */

var mockDebug = jest.fn();

jest.mock('../app/vendor/handlebars.runtime.js', () => {
  const compiledFn = jest.fn((ctx: any) => `<span>${ctx.text}</span>`);
  const template = jest.fn(() => compiledFn);
  return { __esModule: true, default: { template } };
});

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: jest.fn(
    () =>
      (...args: any[]) =>
        mockDebug(...args)
  )
}));

jest.mock(
  '../app/compiled-templates/mock.cjs',
  () => ({
    __esModule: true,
    default: { name: 'mock' }
  }),
  { virtual: true }
);

let loadTemplate: any;
const handlebars = require('../app/vendor/handlebars.runtime.js').default;

beforeAll(() => {
  // Defer requiring module under test until after mocks are set up
  ({ loadTemplate } = require('../app/ts/renderer/templateLoader'));
});

beforeEach(() => {
  mockDebug.mockClear();
});

describe('loadTemplate', () => {
  test('dynamically loads template and inserts html', async () => {
    document.body.innerHTML = '<div id="target"></div>';
    await loadTemplate('#target', 'mock.hbs', { text: 'hello' });

    expect(handlebars.template).toHaveBeenCalledWith({ name: 'mock' });
    expect(document.querySelector<HTMLElement>('#target')?.innerHTML).toBe('<span>hello</span>');
  });

  test('handles missing template gracefully', async () => {
    document.body.innerHTML = '<div id="target"></div>';
    await expect(loadTemplate('#target', 'missing.hbs', {}, 'fallback')).resolves.toBeUndefined();

    expect(document.querySelector<HTMLElement>('#target')?.innerHTML).toBe('fallback');
    expect(mockDebug).toHaveBeenCalled();
  });
});

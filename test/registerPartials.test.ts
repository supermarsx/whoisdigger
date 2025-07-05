const partialNames = [
  'bulkwhoisEntry',
  'bulkwhoisExport',
  'bulkwhoisExportLoading',
  'bulkwhoisFileInputConfirm',
  'bulkwhoisFileInputLoading',
  'bulkwhoisProcessing',
  'bulkwhoisWordlistConfirm',
  'bulkwhoisWordlistInput',
  'bulkwhoisWordlistLoading',
  'bwaAnalyser',
  'bwaEntry',
  'bwaFileInputLoading',
  'bwaFileinputconfirm',
  'bwaProcess',
  'navBottom',
  'navTop',
  'settingsEntry',
  'singlewhois',
  'toEntry',
  'he',
  'modals'
];

jest.mock('../app/vendor/handlebars.runtime.js', () => {
  const template = jest.fn((pre: any) => `compiled-${pre.name}`);
  const registerPartial = jest.fn();
  return { __esModule: true, default: { template, registerPartial } };
});

for (const name of partialNames) {
  jest.mock(
    `../app/compiled-templates/${name}.js`,
    () => ({
      __esModule: true,
      default: { name }
    }),
    { virtual: true }
  );
}

const handlebars = require('../app/vendor/handlebars.runtime.js').default;
const { registerPartials } = require('../app/ts/renderer/registerPartials');

describe('registerPartials', () => {
  beforeEach(() => {
    (handlebars.registerPartial as jest.Mock).mockClear();
    (handlebars.template as jest.Mock).mockClear();
  });

  test('registers compiled partials with Handlebars', () => {
    registerPartials();

    expect((handlebars.template as jest.Mock).mock.calls.length).toBe(partialNames.length);
    expect((handlebars.registerPartial as jest.Mock).mock.calls.length).toBe(partialNames.length);

    partialNames.forEach((name, index) => {
      const precompiled = { name };
      expect((handlebars.template as jest.Mock).mock.calls[index][0]).toEqual(precompiled);
      expect((handlebars.registerPartial as jest.Mock).mock.calls[index]).toEqual([
        name,
        `compiled-${name}`
      ]);
    });
  });
});

const partialNames = [
  'bwEntry',
  'bwExport',
  'bwExportLoading',
  'bwFileInputConfirm',
  'bwFileInputLoading',
  'bwProcessing',
  'bwWordlistConfirm',
  'bwWordlistInput',
  'bwWordlistLoading',
  'bwaAnalyser',
  'bwaEntry',
  'bwaFileInputLoading',
  'bwaFileinputconfirm',
  'bwaProcess',
  'navBottom',
  'navTop',
  'opEntry',
  'singlewhois',
  'toEntry',
  'he',
  'modals'
];

const handlebarsMock = {
  template: jest.fn((pre: any) => `compiled-${pre.name}`),
  registerPartial: jest.fn()
};

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

let registerPartials: () => void;

beforeAll(() => {
  (global as any).window = { Handlebars: handlebarsMock };
  registerPartials = require('../app/ts/renderer/registerPartials').registerPartials;
});

describe('registerPartials', () => {
  beforeEach(() => {
    (handlebarsMock.registerPartial as jest.Mock).mockClear();
    (handlebarsMock.template as jest.Mock).mockClear();
  });

  test('registers compiled partials with Handlebars', () => {
    registerPartials();

    expect((handlebarsMock.template as jest.Mock).mock.calls.length).toBe(partialNames.length);
    expect((handlebarsMock.registerPartial as jest.Mock).mock.calls.length).toBe(
      partialNames.length
    );

    partialNames.forEach((name, index) => {
      const precompiled = { name };
      expect((handlebarsMock.template as jest.Mock).mock.calls[index][0]).toEqual(precompiled);
      expect((handlebarsMock.registerPartial as jest.Mock).mock.calls[index]).toEqual([
        name,
        `compiled-${name}`
      ]);
    });
  });
});

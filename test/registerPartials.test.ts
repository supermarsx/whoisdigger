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

beforeAll(() => {
  (global as any).__glob = () => {
    const modules: Record<string, any> = {};
    for (const name of partialNames) {
      modules[`../../compiled-templates/${name}.js`] = { default: { name } };
    }
    return modules;
  };
});

afterAll(() => {
  delete (global as any).__glob;
});

const handlebars = require('../app/vendor/handlebars.runtime.js').default;
let registerPartials: () => Promise<void>;

beforeAll(async () => {
  ({ registerPartials } = await import('../dist/app/ts/renderer/registerPartials.js'));
});

describe('registerPartials', () => {
  beforeEach(() => {
    (handlebars.registerPartial as jest.Mock).mockClear();
    (handlebars.template as jest.Mock).mockClear();
  });

  test.skip('registers compiled partials with Handlebars', async () => {
    await registerPartials();

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

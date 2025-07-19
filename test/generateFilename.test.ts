import { generateFilename } from '../app/ts/cli/export';

describe('generateFilename', () => {
  const RealDate = Date;
  let randomBytesSpy: jest.SpyInstance;

  beforeAll(() => {
    class MockDate extends RealDate {
      constructor() {
        super('2021-01-02T03:04:05Z');
      }
      static now() {
        return new RealDate('2021-01-02T03:04:05Z').getTime();
      }
    }
    // @ts-ignore
    global.Date = MockDate as DateConstructor;
    randomBytesSpy = jest
      .spyOn(require('crypto'), 'randomBytes')
      .mockReturnValue(Buffer.from('012345', 'hex'));
  });

  afterAll(() => {
    // @ts-ignore
    global.Date = RealDate;
    randomBytesSpy.mockRestore();
  });

  test('returns deterministic filename with given extension', () => {
    const result = generateFilename('.csv');
    expect(result).toBe('bulkwhois-export-20210102030405-012345.csv');
  });
});

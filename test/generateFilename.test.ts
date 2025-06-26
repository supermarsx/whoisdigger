import './electronMainMock';
import { generateFilename } from '../app/ts/main/bw/export';

describe('generateFilename', () => {
  const RealDate = Date;
  const RealRandom = Math.random;

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
    Math.random = () => 0.1;
  });

  afterAll(() => {
    // @ts-ignore
    global.Date = RealDate;
    Math.random = RealRandom;
  });

  test('returns deterministic filename with given extension', () => {
    const result = generateFilename('.csv');
    expect(result).toBe('bulkwhois-export-20210102030405-199999.csv');
  });
});

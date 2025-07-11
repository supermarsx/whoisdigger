import { getTimeEstimates } from '../app/ts/renderer/bulkwhois/estimate';
import { defaultSettings } from '../app/ts/common/settings-base';

describe('getTimeEstimates', () => {
  test('returns min and max when randomization enabled', () => {
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.lookupRandomizeTimeBetween.randomize = true;
    settings.lookupRandomizeTimeBetween.minimum = 10;
    settings.lookupRandomizeTimeBetween.maximum = 20;
    const est = getTimeEstimates(2, settings);
    expect(est).toEqual({ min: '20 ms', max: '40 ms' });
  });

  test('returns only min when randomization disabled', () => {
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupGeneral.timeBetween = 15;
    const est = getTimeEstimates(2, settings);
    expect(est).toEqual({ min: '30 ms' });
  });
});

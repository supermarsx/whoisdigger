import './electronMainMock';
import { getDomainSetup } from '../app/ts/main/bulkwhois/process';
import { settings } from '../app/ts/main/settings-main';

describe('getDomainSetup', () => {
  test('returns randomized values within configured bounds', () => {
    const backup = JSON.parse(JSON.stringify(settings));

    settings.lookupRandomizeTimeBetween.randomize = true;
    settings.lookupRandomizeTimeBetween.minimum = 1;
    settings.lookupRandomizeTimeBetween.maximum = 2;

    settings.lookupRandomizeFollow.randomize = true;
    settings.lookupRandomizeFollow.minimumDepth = 1;
    settings.lookupRandomizeFollow.maximumDepth = 2;

    settings.lookupRandomizeTimeout.randomize = true;
    settings.lookupRandomizeTimeout.minimum = 10;
    settings.lookupRandomizeTimeout.maximum = 20;

    const result = getDomainSetup(settings, {
      timeBetween: true,
      followDepth: true,
      timeout: true
    });

    expect(result.timebetween).toBeGreaterThanOrEqual(settings.lookupRandomizeTimeBetween.minimum);
    expect(result.timebetween).toBeLessThanOrEqual(settings.lookupRandomizeTimeBetween.maximum);

    expect(result.follow).toBeGreaterThanOrEqual(settings.lookupRandomizeFollow.minimumDepth);
    expect(result.follow).toBeLessThanOrEqual(settings.lookupRandomizeFollow.maximumDepth);

    expect(result.timeout).toBeGreaterThanOrEqual(settings.lookupRandomizeTimeout.minimum);
    expect(result.timeout).toBeLessThanOrEqual(settings.lookupRandomizeTimeout.maximum);

    Object.assign(settings.lookupRandomizeTimeBetween, backup.lookupRandomizeTimeBetween);
    Object.assign(settings.lookupRandomizeFollow, backup.lookupRandomizeFollow);
    Object.assign(settings.lookupRandomizeTimeout, backup.lookupRandomizeTimeout);
  });
});

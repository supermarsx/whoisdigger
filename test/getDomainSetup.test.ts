import './electronMainMock';
import { getDomainSetup } from '../app/ts/main/bw/process';
import { settings } from '../app/ts/common/settings';

describe('getDomainSetup', () => {
  test('returns randomized values within configured bounds', () => {
    const backup = JSON.parse(JSON.stringify(settings));

    settings['lookup.randomize.timeBetween'].randomize = true;
    settings['lookup.randomize.timeBetween'].minimum = 1;
    settings['lookup.randomize.timeBetween'].maximum = 2;

    settings['lookup.randomize.follow'].randomize = true;
    settings['lookup.randomize.follow'].minimumDepth = 1;
    settings['lookup.randomize.follow'].maximumDepth = 2;

    settings['lookup.randomize.timeout'].randomize = true;
    settings['lookup.randomize.timeout'].minimum = 10;
    settings['lookup.randomize.timeout'].maximum = 20;

    const result = getDomainSetup(settings, {
      timeBetween: true,
      followDepth: true,
      timeout: true,
    });

    expect(result.timebetween).toBeGreaterThanOrEqual(
      settings['lookup.randomize.timeBetween'].minimum,
    );
    expect(result.timebetween).toBeLessThan(
      settings['lookup.randomize.timeBetween'].minimum +
        settings['lookup.randomize.timeBetween'].maximum,
    );

    expect(result.follow).toBeGreaterThanOrEqual(
      settings['lookup.randomize.follow'].minimumDepth,
    );
    expect(result.follow).toBeLessThan(
      settings['lookup.randomize.follow'].minimumDepth +
        settings['lookup.randomize.follow'].maximumDepth,
    );

    expect(result.timeout).toBeGreaterThanOrEqual(
      settings['lookup.randomize.timeout'].minimum,
    );
    expect(result.timeout).toBeLessThan(
      settings['lookup.randomize.timeout'].minimum +
        settings['lookup.randomize.timeout'].maximum,
    );

    Object.assign(
      settings['lookup.randomize.timeBetween'],
      backup['lookup.randomize.timeBetween'],
    );
    Object.assign(
      settings['lookup.randomize.follow'],
      backup['lookup.randomize.follow'],
    );
    Object.assign(
      settings['lookup.randomize.timeout'],
      backup['lookup.randomize.timeout'],
    );
  });
});

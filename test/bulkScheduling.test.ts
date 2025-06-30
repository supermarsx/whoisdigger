import './electronMainMock';

jest.useFakeTimers();

jest.mock('../app/ts/common/lookup', () => ({
  lookup: jest.fn(async () => 'ok')
}));

jest.mock('../app/ts/common/dnsLookup', () => ({
  hasNsServers: jest.fn(async () => ({ ok: true, value: true }))
}));

jest.mock('../app/ts/main/bw/resultHandler', () => ({
  processData: jest.fn(async () => {})
}));

import defaultBulkWhois from '../app/ts/main/bw/process.defaults';
import { compileQueue, getDomainSetup } from '../app/ts/main/bw/queue';
import { processDomain } from '../app/ts/main/bw/scheduler';
import { settings } from '../app/ts/main/settings-main';

const { processData } = require('../app/ts/main/bw/resultHandler');

describe('bulk scheduling', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  test('queues domains with randomized setup and schedules timers', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';

    settings.lookupRandomizeTimeBetween.randomize = true;
    settings.lookupRandomizeTimeBetween.minimum = 10;
    settings.lookupRandomizeTimeBetween.maximum = 20;

    settings.lookupRandomizeFollow.randomize = true;
    settings.lookupRandomizeFollow.minimumDepth = 1;
    settings.lookupRandomizeFollow.maximumDepth = 2;

    settings.lookupRandomizeTimeout.randomize = true;
    settings.lookupRandomizeTimeout.minimum = 100;
    settings.lookupRandomizeTimeout.maximum = 200;

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const queue = compileQueue(['foo', 'bar'], ['com', 'net'], '.');
    expect(queue.length).toBe(4);

    const bulkWhois = JSON.parse(JSON.stringify(defaultBulkWhois));
    const event = { sender: { send: jest.fn() } } as any;
    const reqtime: number[] = [];
    const timerSpy = jest.spyOn(global, 'setTimeout');

    let delay = 0;
    queue.forEach((domain, index) => {
      const setup = getDomainSetup(settings, {
        timeBetween: true,
        followDepth: true,
        timeout: true
      });
      expect(setup.timebetween).toBeGreaterThanOrEqual(10);
      expect(setup.timebetween).toBeLessThan(30);
      setup.domain = domain;
      setup.index = index;
      delay += setup.timebetween;
      processDomain(bulkWhois, reqtime, setup, event, delay);
    });

    expect(timerSpy).toHaveBeenCalledTimes(4);
    expect(timerSpy.mock.calls.map((c) => c[1])).toEqual([10, 20, 30, 40]);

    jest.runAllTimers();
    await Promise.resolve();
    expect(bulkWhois.stats.domains.sent).toBe(4);

    randomSpy.mockRestore();
    Object.assign(settings, backup);
  });
});

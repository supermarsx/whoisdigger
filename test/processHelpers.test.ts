import defaultBulkWhois from '../app/ts/main/bulkwhois/process.defaults';
import {
  compileDomains,
  createDomainSetup,
  updateProgress,
  setRemainingCounter,
  scheduleQueue
} from '../app/ts/main/bulkwhois/helpers';
import { compileQueue } from '../app/ts/main/bulkwhois/queue';
import { settings } from '../app/ts/main/settings-main';
import { IpcChannel } from '../app/ts/common/ipcChannels';
import { processDomain } from '../app/ts/main/bulkwhois/scheduler';

jest.mock('../app/ts/main/bulkwhois/scheduler', () => ({
  processDomain: jest.fn(),
  counter: jest.fn()
}));

describe('process helpers', () => {
  test('compileDomains populates queue and totals', () => {
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    const sender = { send: jest.fn() } as any;
    compileDomains(bulk, ['foo'], ['com'], sender);
    expect(bulk.input.domains).toEqual(['foo']);
    expect(bulk.input.tlds).toEqual(['com']);
    expect(bulk.stats.domains.total).toBe(1);
    expect(bulk.input.domainsPending).toEqual(['foo.' + 'com']);
    expect(sender.send).toHaveBeenCalledWith(IpcChannel.BulkwhoisStatusUpdate, 'domains.total', 1);
  });

  test('compileQueue returns empty when domains or tlds are missing', () => {
    expect(compileQueue([], ['com'], '.')).toEqual([]);
    expect(compileQueue(['foo'], [], '.')).toEqual([]);
    expect(compileQueue([], [], '.')).toEqual([]);
  });

  test('createDomainSetup returns static settings', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.timeBetween = 10;
    settings.lookupGeneral.follow = 1;
    settings.lookupGeneral.timeout = 100;
    settings.lookupGeneral.type = 'whois';
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupRandomizeFollow.randomize = false;
    settings.lookupRandomizeTimeout.randomize = false;
    const setup = createDomainSetup(settings, 'foo.com', 0);
    expect(setup).toEqual({
      domain: 'foo.com',
      index: 0,
      timebetween: 10,
      follow: 1,
      timeout: 100
    });
    Object.assign(settings, backup);
  });

  test('createDomainSetup uses dnsTimeBetween override', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.timeBetween = 10;
    settings.lookupGeneral.dnsTimeBetween = 20;
    settings.lookupGeneral.type = 'dns';
    settings.lookupGeneral.dnsTimeBetweenOverride = true;
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupRandomizeFollow.randomize = false;
    settings.lookupRandomizeTimeout.randomize = false;
    const setup = createDomainSetup(settings, 'foo.net', 0);
    expect(setup.timebetween).toBe(settings.lookupGeneral.dnsTimeBetween);
    Object.assign(settings, backup);
  });

  test('createDomainSetup dns override ignores randomization', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.timeBetween = 5;
    settings.lookupGeneral.dnsTimeBetween = 50;
    settings.lookupGeneral.type = 'dns';
    settings.lookupGeneral.dnsTimeBetweenOverride = true;

    settings.lookupRandomizeTimeBetween.randomize = true;
    settings.lookupRandomizeTimeBetween.minimum = 1;
    settings.lookupRandomizeTimeBetween.maximum = 100;

    const orig = Math.random;
    Math.random = () => 0.25;
    const setup = createDomainSetup(settings, 'bar.net', 1);
    expect(setup.timebetween).toBe(settings.lookupGeneral.dnsTimeBetween);
    Math.random = orig;
    Object.assign(settings, backup);
  });

  test('createDomainSetup swaps random range bounds', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';

    settings.lookupRandomizeTimeBetween.randomize = true;
    settings.lookupRandomizeTimeBetween.minimum = 20;
    settings.lookupRandomizeTimeBetween.maximum = 10;

    settings.lookupRandomizeFollow.randomize = true;
    settings.lookupRandomizeFollow.minimumDepth = 5;
    settings.lookupRandomizeFollow.maximumDepth = 2;

    settings.lookupRandomizeTimeout.randomize = true;
    settings.lookupRandomizeTimeout.minimum = 300;
    settings.lookupRandomizeTimeout.maximum = 200;

    const orig = Math.random;
    Math.random = () => 0;
    let setup = createDomainSetup(settings, 'foo.com', 0);
    expect(setup.timebetween).toBe(10);
    expect(setup.follow).toBe(2);
    expect(setup.timeout).toBe(200);

    Math.random = () => 0.999;
    setup = createDomainSetup(settings, 'foo.com', 0);
    expect(setup.timebetween).toBe(20);
    expect(setup.follow).toBe(5);
    expect(setup.timeout).toBe(300);

    Math.random = orig;
    Object.assign(settings, backup);
  });

  test('updateProgress updates stats and sends', () => {
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    const sender = { send: jest.fn() } as any;
    updateProgress(sender, bulk.stats, 5);
    expect(bulk.stats.domains.processed).toBe(5);
    expect(sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.processed',
      5
    );
  });

  test('setRemainingCounter uses defaults', () => {
    const backup = JSON.parse(JSON.stringify(settings));
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    bulk.stats.domains.total = 2;
    settings.lookupGeneral.timeBetween = 5;
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupGeneral.timeout = 1;
    settings.lookupRandomizeTimeout.randomize = false;
    setRemainingCounter(settings, bulk.stats);
    expect(bulk.stats.time.remainingcounter).toBe(2 * 5 + 1);
    Object.assign(settings, backup);
  });

  test('scheduleQueue processes all pending domains', () => {
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    bulk.input.domainsPending = ['a.com', 'b.net'];
    const event = { sender: { send: jest.fn() } } as any;
    const reqtime: number[] = [];
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupRandomizeFollow.randomize = false;
    settings.lookupRandomizeTimeout.randomize = false;
    settings.lookupGeneral.timeBetween = 1;
    settings.lookupGeneral.follow = 1;
    settings.lookupGeneral.timeout = 1;

    scheduleQueue(bulk, reqtime, settings, event);

    expect(processDomain).toHaveBeenCalledTimes(2);
    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.processed',
      1
    );
    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.processed',
      2
    );
    Object.assign(settings, backup);
  });

  test('scheduleQueue exits with no pending domains', () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.clearAllTimers();
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    const event = { sender: { send: jest.fn() } } as any;
    const reqtime: number[] = [];
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupRandomizeFollow.randomize = false;
    settings.lookupRandomizeTimeout.randomize = false;
    settings.lookupGeneral.timeBetween = 1;
    settings.lookupGeneral.follow = 1;
    settings.lookupGeneral.timeout = 1;

    scheduleQueue(bulk, reqtime, settings, event);

    expect(processDomain).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    Object.assign(settings, backup);
    jest.useRealTimers();
  });

  test('scheduleQueue leaves counters unchanged when pending list is empty', () => {
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    const event = { sender: { send: jest.fn() } } as any;
    const reqtime: number[] = [];
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupRandomizeFollow.randomize = false;
    settings.lookupRandomizeTimeout.randomize = false;
    settings.lookupGeneral.timeBetween = 1;
    settings.lookupGeneral.follow = 1;
    settings.lookupGeneral.timeout = 1;

    scheduleQueue(bulk, reqtime, settings, event);

    expect(processDomain).not.toHaveBeenCalled();
    expect(event.sender.send).not.toHaveBeenCalled();
    expect(reqtime).toEqual([]);
    expect(bulk.stats.domains.processed).toBe(0);
    Object.assign(settings, backup);
  });
});

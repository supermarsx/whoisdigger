import defaultBulkWhois from '../app/ts/main/bulkwhois/process.defaults';
import {
  compileDomains,
  createDomainSetup,
  updateProgress,
  setRemainingCounter
} from '../app/ts/main/bulkwhois/helpers';
import { settings } from '../app/ts/main/settings-main';
import { IpcChannel } from '../app/ts/common/ipcChannels';

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
});

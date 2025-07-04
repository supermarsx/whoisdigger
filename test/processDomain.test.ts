import { performance } from 'perf_hooks';

jest.useFakeTimers();

jest.mock('../app/ts/common/lookup', () => ({
  lookup: jest.fn(async () => 'whois-result')
}));

jest.mock('../app/ts/common/dnsLookup', () => ({
  hasNsServers: jest.fn(async () => ({ ok: true, value: true }))
}));

jest.mock('../app/ts/main/bulkwhois/resultHandler', () => ({
  processData: jest.fn(async () => {})
}));

import defaultBulkWhois from '../app/ts/main/bulkwhois/process.defaults';
import { processDomain } from '../app/ts/main/bulkwhois/scheduler';
import { settings } from '../app/ts/main/settings-main';
import type { DomainSetup } from '../app/ts/main/bulkwhois/types';
import { IpcChannel } from '../app/ts/common/ipcChannels';

const { lookup } = require('../app/ts/common/lookup');
const { hasNsServers } = require('../app/ts/common/dnsLookup');
const { processData } = require('../app/ts/main/bulkwhois/resultHandler');

describe('processDomain', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('schedules whois lookup and updates stats', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';

    const bulkWhois = JSON.parse(JSON.stringify(defaultBulkWhois));
    const event = { sender: { send: jest.fn() } } as any;
    const reqtime: number[] = [];
    const setup: DomainSetup = {
      domain: 'example.com',
      index: 0,
      timebetween: 10,
      follow: 2,
      timeout: 100
    };

    const timerSpy = jest.spyOn(global, 'setTimeout');
    const nowSpy = jest.spyOn(performance, 'now').mockReturnValue(42);

    processDomain(bulkWhois, reqtime, setup, event, 10);

    expect(timerSpy).toHaveBeenCalledWith(expect.any(Function), 10);
    expect(bulkWhois.processingIDs[0]).toBeDefined();

    await jest.runAllTimersAsync();

    expect(lookup).toHaveBeenCalledWith('example.com', { follow: 2, timeout: 100 });
    expect(processData).toHaveBeenCalledWith(
      bulkWhois,
      reqtime,
      event,
      'example.com',
      0,
      'whois-result',
      false
    );

    expect(bulkWhois.stats.domains.sent).toBe(1);
    expect(bulkWhois.stats.domains.waiting).toBe(1);
    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.sent',
      1
    );
    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.waiting',
      1
    );
    expect(reqtime[0]).toBe(42);

    timerSpy.mockRestore();
    nowSpy.mockRestore();
    Object.assign(settings, backup);
  });

  test('uses dns lookup when type is not whois', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'dns';

    const bulkWhois = JSON.parse(JSON.stringify(defaultBulkWhois));
    const event = { sender: { send: jest.fn() } } as any;
    const reqtime: number[] = [];
    const setup: DomainSetup = {
      domain: 'example.net',
      index: 1,
      timebetween: 5,
      follow: 1,
      timeout: 50
    };

    const timerSpy = jest.spyOn(global, 'setTimeout');
    const nowSpy = jest.spyOn(performance, 'now').mockReturnValue(100);

    processDomain(bulkWhois, reqtime, setup, event, 10);

    expect(timerSpy).toHaveBeenCalledWith(expect.any(Function), 10);
    expect(bulkWhois.processingIDs[1]).toBeDefined();

    await jest.runAllTimersAsync();

    expect(hasNsServers).toHaveBeenCalledWith('example.net');
    expect(processData).toHaveBeenCalledWith(
      bulkWhois,
      reqtime,
      event,
      'example.net',
      1,
      { ok: true, value: true },
      false
    );

    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.sent',
      1
    );
    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'domains.waiting',
      1
    );
    expect(bulkWhois.stats.domains.sent).toBe(1);
    expect(bulkWhois.stats.domains.waiting).toBe(1);
    expect(reqtime[1]).toBe(100);

    timerSpy.mockRestore();
    nowSpy.mockRestore();
    Object.assign(settings, backup);
  });
});

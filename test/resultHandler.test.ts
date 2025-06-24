import { performance } from 'perf_hooks';
import defaultBulkWhois from '../app/ts/main/bw/process.defaults';
import { processData } from '../app/ts/main/bw/resultHandler';
import { settings } from '../app/ts/common/settings';

jest.mock('../app/ts/common/availability', () => ({
  isDomainAvailable: jest.fn(),
  getDomainParameters: jest.fn()
}));

jest.mock('../app/ts/common/parser', () => ({
  toJSON: jest.fn()
}));

jest.mock('../app/ts/common/dnsLookup', () => ({
  isDomainAvailable: jest.fn()
}));

const { isDomainAvailable, getDomainParameters } = require('../app/ts/common/availability');
const { toJSON } = require('../app/ts/common/parser');
const { isDomainAvailable: dnsIsDomainAvailable } = require('../app/ts/common/dnsLookup');

function createSetup() {
  const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
  bulk.stats.domains.waiting = 1;
  const send = jest.fn();
  const event = { sender: { send } } as any;
  const reqtime: number[] = [0];
  return { bulk, send, event, reqtime };
}

describe('processData', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('stores results for successful whois lookup', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';

    const { bulk, event, reqtime } = createSetup();

    jest.spyOn(performance, 'now').mockReturnValue(50);

    (isDomainAvailable as jest.Mock).mockReturnValue('available');
    (toJSON as jest.Mock).mockReturnValue({});
    (getDomainParameters as jest.Mock).mockReturnValue({
      domain: 'example.com',
      status: 'available',
      registrar: 'reg',
      company: 'comp',
      creationDate: 'c',
      updateDate: 'u',
      expiryDate: 'e',
      whoisreply: 'reply',
      whoisJson: { a: 1 }
    });

    await processData(bulk, reqtime, event, 'example.com', 0, 'data', false);

    expect(bulk.stats.reqtimes.minimum).toBe(50);
    expect(bulk.stats.reqtimes.maximum).toBe('50.00');
    expect(bulk.stats.reqtimes.last).toBe('50.00');
    expect(bulk.stats.reqtimes.average).toBe('50.00');
    expect(bulk.stats.status.available).toBe(1);
    expect(bulk.stats.domains.waiting).toBe(0);
    expect(bulk.results.domain[0]).toBe('example.com');
    expect(bulk.results.status[0]).toBe('available');
    expect(bulk.results.registrar[0]).toBe('reg');
    expect(bulk.results.requesttime[0]).toBe(50);

    Object.assign(settings, backup);
  });

  test('handles error during whois lookup', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'whois';

    const { bulk, event, reqtime } = createSetup();

    jest.spyOn(performance, 'now').mockReturnValue(75);

    (toJSON as jest.Mock).mockReturnValue({});
    (getDomainParameters as jest.Mock).mockReturnValue({ domain: 'example.com' });

    await processData(bulk, reqtime, event, 'example.com', 0, 'err', true);

    expect(bulk.stats.reqtimes.minimum).toBe(75);
    expect(bulk.stats.status.error).toBe(1);
    expect(bulk.stats.laststatus.error).toBe('example.com');
    expect(bulk.results.domain[0]).toBe('example.com');
    expect(bulk.results.status[0]).toBeNull();
    expect(bulk.stats.domains.waiting).toBe(0);

    Object.assign(settings, backup);
  });

  test('stores results for successful dns lookup', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'dns';

    const { bulk, event, reqtime } = createSetup();

    jest.spyOn(performance, 'now').mockReturnValue(30);

    (dnsIsDomainAvailable as jest.Mock).mockReturnValue('unavailable');

    await processData(bulk, reqtime, event, 'example.com', 0, { ok: true, value: true }, false);

    expect(bulk.stats.reqtimes.minimum).toBe(30);
    expect(bulk.stats.status.unavailable).toBe(1);
    expect(bulk.results.domain[0]).toBe('example.com');
    expect(bulk.results.status[0]).toBe('unavailable');
    expect(bulk.results.registrar[0]).toBeNull();
    expect(bulk.results.requesttime[0]).toBe(30);

    Object.assign(settings, backup);
  });

  test('handles error during dns lookup', async () => {
    const backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.type = 'dns';

    const { bulk, event, reqtime } = createSetup();

    jest.spyOn(performance, 'now').mockReturnValue(80);

    await processData(bulk, reqtime, event, 'example.com', 0, { ok: false, error: new Error('fail') }, true);

    expect(bulk.stats.reqtimes.minimum).toBe(80);
    expect(bulk.stats.status.error).toBe(1);
    expect(bulk.results.status[0]).toBeNull();
    expect(bulk.results.domain[0]).toBe('example.com');
    expect(bulk.stats.domains.waiting).toBe(0);

    Object.assign(settings, backup);
  });
});


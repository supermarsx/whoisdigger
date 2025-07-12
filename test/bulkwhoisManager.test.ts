import { BulkWhoisManager } from '../app/ts/main/bulkwhois/manager';
import { settings } from '../app/ts/main/settings-main';
import { IpcChannel } from '../app/ts/common/ipcChannels';

jest.useFakeTimers();

const processDomainMock = jest.fn(
  (bulk: any, _req: any, setup: any, _event: any, delay: number) => {
    bulk.processingIDs[setup.index] = setTimeout(() => {
      bulk.stats.domains.sent++;
    }, delay);
  }
);

const counterMock = jest.fn((bulk: any, _event: any, start = true) => {
  if (start) {
    bulk.stats.time.counter = setInterval(() => {}, 1000);
  } else {
    clearInterval(bulk.stats.time.counter!);
  }
});

jest.mock('../app/ts/main/bulkwhois/scheduler', () => ({
  processDomain: (...args: any[]) => processDomainMock(...args),
  counter: (...args: any[]) => counterMock(...args)
}));

describe('BulkWhoisManager timers', () => {
  let manager: BulkWhoisManager;
  let event: any;
  let backup: any;

  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    manager = new BulkWhoisManager();
    event = { sender: { send: jest.fn() } } as any;
    backup = JSON.parse(JSON.stringify(settings));
    settings.lookupGeneral.timeBetween = 10;
    settings.lookupGeneral.follow = 1;
    settings.lookupGeneral.timeout = 100;
    settings.lookupRandomizeTimeBetween.randomize = false;
    settings.lookupRandomizeFollow.randomize = false;
    settings.lookupRandomizeTimeout.randomize = false;
  });

  afterEach(() => {
    Object.assign(settings, backup);
  });

  test('pause clears outstanding timers', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    manager.startLookup(event, ['a', 'b'], ['com']);
    const ids = manager['bulkWhois'].processingIDs.slice();

    jest.advanceTimersByTime(10);

    manager.pause(event);

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledWith(ids[1]);
    clearSpy.mockRestore();
  });

  test('resume schedules remaining domains', () => {
    manager.startLookup(event, ['a', 'b'], ['com']);
    jest.advanceTimersByTime(10);
    manager.pause(event);
    const before = processDomainMock.mock.calls.length;

    manager.resume(event);

    expect(processDomainMock.mock.calls.length).toBe(before + 1);
    const [, , setup, , delay] = processDomainMock.mock.calls[before];
    expect(setup.index).toBe(1);
    expect(delay).toBe(10);
  });

  test('stop sends results and clears interval', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    manager.startLookup(event, ['a'], ['com']);
    jest.advanceTimersByTime(10);
    const intervalId = manager['bulkWhois'].stats.time.counter;

    manager.stop(event);

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    expect(event.sender.send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisResultReceive,
      manager['bulkWhois'].results
    );
    expect(event.sender.send).toHaveBeenCalledWith(IpcChannel.BulkwhoisStatusUpdate, 'finished');
    expect(jest.getTimerCount()).toBe(0);
    clearIntervalSpy.mockRestore();
  });
});

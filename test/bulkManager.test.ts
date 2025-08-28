import { BulkWhoisManager } from '../app/ts/main/bulkwhois/manager';
import { settings } from '../app/ts/main/settings-main';
import { IpcChannel } from '../app/ts/common/ipcChannels';

jest.useFakeTimers();

const mockProcessDomain = jest.fn(
  (bulk: any, _req: any, setup: any, _event: any, delay: number) => {
    bulk.processingIDs[setup.index] = setTimeout(() => {
      bulk.stats.domains.sent++;
    }, delay);
  }
);

const mockCounter = jest.fn((bulk: any, _event: any, start = true) => {
  if (start) {
    bulk.stats.time.counter = setInterval(() => {}, 1000);
  } else {
    clearInterval(bulk.stats.time.counter!);
  }
});

jest.mock('../app/ts/main/bulkwhois/scheduler', () => ({
  processDomain: (...args: any[]) => mockProcessDomain(...args),
  counter: (...args: any[]) => mockCounter(...args)
}));

describe('BulkWhoisManager control flow', () => {
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

  test('startLookup schedules from 0 and starts counter', () => {
    manager.startLookup(event, ['a', 'b'], ['com']);

    expect(mockProcessDomain).toHaveBeenCalledTimes(2);
    expect(mockProcessDomain.mock.calls[0][2].index).toBe(0);
    expect(mockProcessDomain.mock.calls[0][4]).toBe(10);
    expect(mockProcessDomain.mock.calls[1][2].index).toBe(1);
    expect(mockProcessDomain.mock.calls[1][4]).toBe(20);
    expect(mockCounter).toHaveBeenCalledWith(manager['bulkWhois'], event);
  });

  test('pause clears pending timers and pauses counter', () => {
    manager.startLookup(event, ['a', 'b'], ['com']);
    jest.advanceTimersByTime(10);
    const secondId = manager['bulkWhois'].processingIDs[1];
    const clearSpy = jest.spyOn(global, 'clearTimeout');

    manager.pause(event);

    expect(clearSpy).toHaveBeenCalledWith(secondId);
    expect(mockCounter).toHaveBeenLastCalledWith(manager['bulkWhois'], event, false);
    clearSpy.mockRestore();
  });

  test('resume continues from last index', () => {
    manager.startLookup(event, ['a', 'b'], ['com']);
    jest.advanceTimersByTime(10);
    manager.pause(event);
    const before = mockProcessDomain.mock.calls.length;

    manager.resume(event);

    const newCalls = mockProcessDomain.mock.calls.slice(before);
    expect(newCalls.length).toBeGreaterThan(0);
    const [, , setup, , delay] = newCalls[0];
    expect(setup.index).toBe(1);
    expect(delay).toBe(10);
    expect(mockCounter).toHaveBeenLastCalledWith(manager['bulkWhois'], event);
  });

  test('stop sends results and stops intervals', () => {
    manager.startLookup(event, ['a'], ['com']);
    jest.advanceTimersByTime(10);
    const intervalId = manager['bulkWhois'].stats.time.counter;
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

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

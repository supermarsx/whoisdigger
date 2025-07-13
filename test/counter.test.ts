// Mock processDomain so counter can be tested in isolation
jest.mock('../app/ts/main/bulkwhois/scheduler', () => {
  const actual = jest.requireActual('../app/ts/main/bulkwhois/scheduler');
  return { ...actual, processDomain: jest.fn() };
});

import { counter } from '../app/ts/main/bulkwhois/scheduler';
import defaultBulkWhois from '../app/ts/main/bulkwhois/process.defaults';
import { IpcChannel } from '../app/ts/common/ipcChannels';
import { msToHumanTime } from '../app/ts/common/conversions';
import type { IpcMainEvent } from 'electron';

jest.useFakeTimers();

describe('counter', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  test('updates counters and emits IPC messages until finished', () => {
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    bulk.stats.time.remainingcounter = 3000;
    bulk.stats.domains.total = 1;
    bulk.stats.domains.sent = 0;
    bulk.stats.domains.waiting = 1;
    const send = jest.fn();
    const event = { sender: { send } } as unknown as IpcMainEvent;

    counter(bulk, event, true);
    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(bulk.stats.time.currentcounter).toBe(1000);
    expect(bulk.stats.time.remainingcounter).toBe(2000);
    expect(send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'time.current',
      msToHumanTime(1000)
    );
    expect(send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'time.remaining',
      msToHumanTime(2000)
    );

    send.mockClear();
    jest.advanceTimersByTime(1000);
    expect(bulk.stats.time.currentcounter).toBe(2000);
    expect(bulk.stats.time.remainingcounter).toBe(1000);
    expect(send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'time.current',
      msToHumanTime(2000)
    );
    expect(send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'time.remaining',
      msToHumanTime(1000)
    );

    bulk.stats.domains.sent = 1;
    bulk.stats.domains.waiting = 0;

    send.mockClear();
    jest.advanceTimersByTime(1000);
    expect(bulk.stats.time.currentcounter).toBe(3000);
    expect(bulk.stats.time.remainingcounter).toBe(0);
    expect(send).toHaveBeenCalledWith(
      IpcChannel.BulkwhoisStatusUpdate,
      'time.current',
      msToHumanTime(3000)
    );
    expect(send).toHaveBeenCalledWith(IpcChannel.BulkwhoisStatusUpdate, 'time.remaining', '-');
    expect(send).toHaveBeenCalledWith(IpcChannel.BulkwhoisResultReceive, bulk.results);
    expect(send).toHaveBeenCalledWith(IpcChannel.BulkwhoisStatusUpdate, 'finished');
    expect(jest.getTimerCount()).toBe(0);
  });

  test('counter(false) clears active interval', () => {
    const bulk = JSON.parse(JSON.stringify(defaultBulkWhois));
    bulk.stats.time.remainingcounter = 2000;
    bulk.stats.domains.total = 1;
    bulk.stats.domains.sent = 0;
    bulk.stats.domains.waiting = 1;
    const send = jest.fn();
    const event = { sender: { send } } as unknown as IpcMainEvent;

    counter(bulk, event, true);
    expect(jest.getTimerCount()).toBe(1);

    const clearSpy = jest.spyOn(global, 'clearInterval');
    counter(bulk, event, false);

    expect(clearSpy).toHaveBeenCalledWith(bulk.stats.time.counter);
    expect(jest.getTimerCount()).toBe(0);
    clearSpy.mockRestore();
  });
});

import { resetUiCounters } from '../app/ts/main/bulkwhois/auxiliary';
import { IpcChannel } from '../app/ts/common/ipcChannels';

describe('resetUiCounters', () => {
  test('sends default values to renderer', () => {
    const send = jest.fn();
    const event = { sender: { send } } as any;

    resetUiCounters(event);

    const channel = IpcChannel.BulkwhoisStatusUpdate;
    const integerEvents = [
      'time.current',
      'time.remaining',
      'laststatus.available',
      'laststatus.unavailable',
      'laststatus.error'
    ];
    const stringEvents = [
      'domains.total',
      'domains.waiting',
      'domains.sent',
      'domains.processed',
      'reqtimes.maximum',
      'reqtimes.minimum',
      'reqtimes.last',
      'reqtimes.average',
      'status.available',
      'status.unavailable',
      'status.error'
    ];

    const expected = [
      ...integerEvents.map((e) => [channel, e, 0]),
      ...stringEvents.map((e) => [channel, e, '-'])
    ];

    expect(send.mock.calls).toEqual(expected);
  });
});

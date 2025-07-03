import debugModule from 'debug';
import type { IpcMainEvent } from 'electron';

const debug = debugModule('main.bw.auxiliary');

/*
  resetUiCounters
    Reset bulk whois UI counters to their initial values
  parameters
    event (object) - renderer object
 */

function resetUiCounters(event: IpcMainEvent): void {
  const { sender } = event;

  debug('Resetting bulk whois UI counters');

  const baseValues: { integer: number; string: string } = {
      integer: 0,
      string: '-'
    },
    events: { integer: string[]; string: string[] } = {
      integer: [
        'time.current',
        'time.remaining', // Timers
        'laststatus.available',
        'laststatus.unavailable',
        'laststatus.error' // Last domain status
      ],
      string: [
        'domains.total',
        'domains.waiting',
        'domains.sent',
        'domains.processed', // Domains
        'reqtimes.maximum',
        'reqtimes.minimum',
        'reqtimes.last',
        'reqtimes.average', // Request times
        'status.available',
        'status.unavailable',
        'status.error' // Number stats
      ]
    },
    channel = 'bulkwhois:status.update';

  // Loop through events and send default values
  (Object.keys(events) as Array<keyof typeof events>).forEach((eventType) => {
    events[eventType].forEach((listedEvent) => {
      sender.send(channel, listedEvent, baseValues[eventType]);
    });
  });
}

export { resetUiCounters, resetUiCounters as rstUiCntrs };

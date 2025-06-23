// jshint esversion: 8


import debugModule from 'debug';

const debug = debugModule('main.bw.auxiliary');


/*
  resetUiCounters
    Reset bulk whois UI counters to their initial values
  parameters
    event (object) - renderer object
 */

function resetUiCounters(event) {
  const {
    sender
  } = event;

  debug("Resetting bulk whois UI counters");

  const baseValues = {
      integer: 0,
      string: '-'
    },
    events = {
      integer: [
        'time.current', 'time.remaining', // Timers
        'laststatus.available', 'laststatus.unavailable', 'laststatus.error' // Last domain status
      ],
      string: [
        'domains.total', 'domains.waiting', 'domains.sent', 'domains.processed', // Domains
        'reqtimes.maximum', 'reqtimes.minimum', 'reqtimes.last', 'reqtimes.average', // Request times
        'status.available', 'status.unavailable', 'status.error' // Number stats
      ]
    },
    channel = 'bw:status.update';

  // Loop through events and send default values
  for (const eventType in events)
    for (const listedEvent in events[eventType])
      sender.send(channel, events[eventType][listedEvent], baseValues[eventType]);

}


export {
  resetUiCounters,
  resetUiCounters as rstUiCntrs,
};

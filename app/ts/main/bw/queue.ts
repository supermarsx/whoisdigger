import debugModule from 'debug';
import { formatString } from '../../common/stringformat';
import { loadSettings } from '../../common/settings';
import type { DomainSetup } from './types';

const debug = debugModule('main.bw.queue');
const settings = loadSettings();

export function compileQueue(domains: string[], tlds: string[], separator: string): string[] {
  const queue: string[] = [];
  for (const tld of tlds) {
    queue.push(...domains.map((d) => d + separator + tld));
  }
  return queue;
}

export function getDomainSetup(isRandom: {
  timeBetween: boolean;
  followDepth: boolean;
  timeout: boolean;
}): DomainSetup {
  debug(
    formatString(
      "Time between requests, 'israndom': {0}, 'timebetweenmax': {1}, 'timebetweenmin': {2}, 'timebetween': {3}",
      isRandom,
      settings['lookup.randomize.timeBetween'].maximum,
      settings['lookup.randomize.timeBetween'].minimum,
      settings['lookup.general'].timeBetween,
    ),
  );
  debug(
    formatString(
      "Follow depth, 'israndom': {0}, 'followmax': {1}, 'followmin': {2}, 'follow': {3}",
      isRandom,
      settings['lookup.randomize.follow'].maximumDepth,
      settings['lookup.randomize.follow'].minimumDepth,
      settings['lookup.general'].follow,
    ),
  );
  debug(
    formatString(
      "Request timeout, 'israndom': {0}, 'timeoutmax': {1}, 'timeoutmin': {2}, 'timeout': {3}",
      isRandom,
      settings['lookup.randomize.timeout'].maximum,
      settings['lookup.randomize.timeout'].minimum,
      settings['lookup.general'].timeout,
    ),
  );

  return {
    timebetween: isRandom.timeBetween
      ? Math.floor(
          Math.random() * settings['lookup.randomize.timeBetween'].maximum +
            settings['lookup.randomize.timeBetween'].minimum,
        )
      : settings['lookup.general'].timeBetween,
    follow: isRandom.followDepth
      ? Math.floor(
          Math.random() * settings['lookup.randomize.follow'].maximumDepth +
            settings['lookup.randomize.follow'].minimumDepth,
        )
      : settings['lookup.general'].follow,
    timeout: isRandom.timeout
      ? Math.floor(
          Math.random() * settings['lookup.randomize.timeout'].maximum +
            settings['lookup.randomize.timeout'].minimum,
        )
      : settings['lookup.general'].timeout,
  };
}

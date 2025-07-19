import { debugFactory } from '#common/logger.js';
import { formatString } from '#common/stringformat.js';
import { randomInt } from '#utils/random.js';
import type { Settings } from '../settings-main.js';
import type { DomainSetup } from './types.js';

const debug = debugFactory('bulkwhois.queue');

export function compileQueue(domains: string[], tlds: string[], separator: string): string[] {
  const queue: string[] = [];
  for (const tld of tlds) {
    queue.push(...domains.map((d) => d + separator + tld));
  }
  return queue;
}

export function getDomainSetup(
  settings: Settings,
  isRandom: {
    timeBetween: boolean;
    followDepth: boolean;
    timeout: boolean;
  }
): DomainSetup {
  debug(
    formatString(
      "Time between requests, 'israndom': {0}, 'timebetweenmax': {1}, 'timebetweenmin': {2}, 'timebetween': {3}",
      isRandom,
      settings.lookupRandomizeTimeBetween.maximum,
      settings.lookupRandomizeTimeBetween.minimum,
      settings.lookupGeneral.timeBetween
    )
  );
  debug(
    formatString(
      "Follow depth, 'israndom': {0}, 'followmax': {1}, 'followmin': {2}, 'follow': {3}",
      isRandom,
      settings.lookupRandomizeFollow.maximumDepth,
      settings.lookupRandomizeFollow.minimumDepth,
      settings.lookupGeneral.follow
    )
  );
  debug(
    formatString(
      "Request timeout, 'israndom': {0}, 'timeoutmax': {1}, 'timeoutmin': {2}, 'timeout': {3}",
      isRandom,
      settings.lookupRandomizeTimeout.maximum,
      settings.lookupRandomizeTimeout.minimum,
      settings.lookupGeneral.timeout
    )
  );

  return {
    timebetween: isRandom.timeBetween
      ? randomInt(
          settings.lookupRandomizeTimeBetween.minimum,
          settings.lookupRandomizeTimeBetween.maximum
        )
      : settings.lookupGeneral.timeBetween,
    follow: isRandom.followDepth
      ? randomInt(
          settings.lookupRandomizeFollow.minimumDepth,
          settings.lookupRandomizeFollow.maximumDepth
        )
      : settings.lookupGeneral.follow,
    timeout: isRandom.timeout
      ? randomInt(settings.lookupRandomizeTimeout.minimum, settings.lookupRandomizeTimeout.maximum)
      : settings.lookupGeneral.timeout
  };
}

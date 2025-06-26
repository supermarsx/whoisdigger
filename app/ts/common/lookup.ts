import psl from 'psl';
import puny from 'punycode';
import uts46 from 'idna-uts46';
import whois from 'whois';
import debugModule from 'debug';
import { settings, Settings } from './settings';
import { getCached, setCached, CacheOptions } from './requestCache';
import { getProxy } from './proxy';

const debug = debugModule('common.whoisWrapper');

function getSettings(): Settings {
  return settings;
}

const lookupPromise = (...args: unknown[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    (whois as any).lookup(...args, (err: unknown, data: string) => {
      if (err) return reject(err);
      resolve(data);
      return undefined;
    });
  });
};

export async function lookup(
  domain: string,
  options = getWhoisOptions(),
  cacheOpts: CacheOptions = {}
): Promise<string> {
  const { lookupConversion: conversion, lookupGeneral: general } = getSettings();
  let domainResults: string;

  const cached = getCached('whois', domain, cacheOpts);
  if (cached !== undefined) {
    return cached;
  }

  try {
    domain = conversion.enabled ? convertDomain(domain) : domain;
    if (general.psl) {
      const clean = psl.get(domain);
      domain = clean ? clean.replace(/((\*\.)*)/g, '') : domain;
    }

    debug(`Looking up for ${domain}`);
    domainResults = await lookupPromise(domain, options);
  } catch (e) {
    domainResults = `Whois lookup error, ${e}`;
  }

  setCached('whois', domain, domainResults, cacheOpts);

  return domainResults;
}

export function convertDomain(domain: string, mode?: string): string {
  const { lookupConversion: conversion } = getSettings();

  mode = mode || conversion.algorithm;

  switch (mode) {
    case 'punycode':
      return puny.toASCII(domain);
    case 'uts46':
      return uts46.toAscii(domain);
    case 'uts46-transitional':
      return uts46.toAscii(domain, {
        transitional: true
      });
    case 'ascii':
      return domain.replace(/[^\x00-\x7F]/g, '');
    default:
      return domain;
  }
}

export function getWhoisOptions(): Record<string, unknown> {
  const { lookupGeneral: general } = getSettings();

  const options: Record<string, unknown> = {},
    follow = 'follow',
    timeout = 'timeout';

  options.server = general.server;
  options.follow = getWhoisParameters(follow);
  options.timeout = getWhoisParameters(timeout);
  options.verbose = general.verbose;
  const proxy = getProxy();
  if (proxy) {
    options.proxy = proxy;
  }

  return options;
}

function getWhoisParameters(parameter: string): number | undefined {
  const {
    lookupRandomizeFollow: follow,
    lookupRandomizeTimeout: timeout,
    lookupRandomizeTimeBetween: timeBetween,
    lookupGeneral: general
  } = getSettings();

  switch (parameter) {
    case 'follow':
      debug(
        `Follow depth, 'random': ${follow.randomize}, 'maximum': ${follow.maximumDepth}, 'minimum': ${follow.minimumDepth}, 'default': ${general.follow}`
      );
      return follow.randomize
        ? getRandomInt(follow.minimumDepth, follow.maximumDepth)
        : general.follow;
    case 'timeout':
      debug(
        `Timeout, 'random': ${timeout.randomize}, 'maximum': ${timeout.maximum}, 'minimum': ${timeout.minimum}, 'default': ${general.timeout}`
      );
      return timeout.randomize ? getRandomInt(timeout.minimum, timeout.maximum) : general.timeout;
    case 'timebetween':
      debug(
        `Timebetween, 'random': ${timeBetween.randomize}, 'maximum': ${timeBetween.maximum}, 'minimum': ${timeBetween.minimum}, 'default': ${general.timeBetween}`
      );
      return timeBetween.randomize
        ? getRandomInt(timeBetween.minimum, timeBetween.maximum)
        : general.timeBetween;
    default:
      return undefined;
  }
}

function getRandomInt(min: number, max: number): number {
  min = Math.floor(min);
  max = Math.floor(max);
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default {
  lookup,
  convertDomain,
  getWhoisOptions
};

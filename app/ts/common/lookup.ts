import psl from 'psl';
import punycode from 'punycode';
import uts46 from 'idna-uts46';
import whois from 'whois';
import { debugFactory } from './logger.js';
import { settings, Settings } from './settings.js';
import { RequestCache, CacheOptions } from './requestCache.js';
import { getProxy } from './proxy.js';
import { randomInt } from '../utils/random.js';

export enum WhoisOption {
  Follow,
  Timeout,
  TimeBetween
}

const debug = debugFactory('common.whoisWrapper');

const requestCache = new RequestCache();

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

  domain = conversion.enabled ? convertDomain(domain) : domain;
  if (general.psl) {
    const clean = psl.get(domain);
    domain = clean ? clean.replace(/((\*\.)*)/g, '') : domain;
  }

  const cached = await requestCache.get('whois', domain, cacheOpts);
  if (cached !== undefined) {
    return cached;
  }

  try {
    debug(`Looking up for ${domain}`);
    domainResults = await lookupPromise(domain, options);
  } catch (e) {
    domainResults = `Whois lookup error, ${e}`;
  }

  await requestCache.set('whois', domain, domainResults, cacheOpts);

  return domainResults;
}

export function convertDomain(domain: string, mode?: string): string {
  const { lookupConversion: conversion } = getSettings();

  mode = mode || conversion.algorithm;

  switch (mode) {
    case 'punycode':
      return punycode.toASCII(domain);
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

  const options: Record<string, unknown> = {};

  options.server = general.server;
  options.follow = getWhoisParameters(WhoisOption.Follow);
  options.timeout = getWhoisParameters(WhoisOption.Timeout);
  options.verbose = general.verbose;
  const proxy = getProxy();
  if (proxy) {
    options.proxy = proxy;
  }

  return options;
}

function getWhoisParameters(parameter: WhoisOption): number | undefined {
  const {
    lookupRandomizeFollow: follow,
    lookupRandomizeTimeout: timeout,
    lookupRandomizeTimeBetween: timeBetween,
    lookupGeneral: general
  } = getSettings();

  switch (parameter) {
    case WhoisOption.Follow:
      debug(
        `Follow depth, 'random': ${follow.randomize}, 'maximum': ${follow.maximumDepth}, 'minimum': ${follow.minimumDepth}, 'default': ${general.follow}`
      );
      return follow.randomize
        ? randomInt(follow.minimumDepth, follow.maximumDepth)
        : general.follow;
    case WhoisOption.Timeout:
      debug(
        `Timeout, 'random': ${timeout.randomize}, 'maximum': ${timeout.maximum}, 'minimum': ${timeout.minimum}, 'default': ${general.timeout}`
      );
      return timeout.randomize ? randomInt(timeout.minimum, timeout.maximum) : general.timeout;
    case WhoisOption.TimeBetween:
      debug(
        `Timebetween, 'random': ${timeBetween.randomize}, 'maximum': ${timeBetween.maximum}, 'minimum': ${timeBetween.minimum}, 'default': ${general.timeBetween}`
      );
      return timeBetween.randomize
        ? randomInt(timeBetween.minimum, timeBetween.maximum)
        : general.timeBetween;
    default:
      return undefined;
  }
}

export default {
  lookup,
  convertDomain,
  getWhoisOptions
};

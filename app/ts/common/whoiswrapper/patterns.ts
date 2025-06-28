import { settings as appSettings, Settings } from '../settings.js';
import { toJSON } from '../parser.js';
import { getDomainParameters, WhoisResult } from '../availability.js';
import { getDate } from '../conversions.js';

export interface PatternFunction {
  (context: PatternContext): boolean;
}

export interface PatternContext {
  resultsText: string;
  resultsJSON: Record<string, unknown>;
  domainParams: WhoisResult;
  controlDate: string | undefined;
}

export interface CompiledPattern {
  fn: PatternFunction;
  result: string;
}

export interface PatternCollections {
  special: CompiledPattern[];
  available: CompiledPattern[];
  unavailable: CompiledPattern[];
  error: CompiledPattern[];
}

export interface BaseConditionSpec {
  result?: string;
}

export interface IncludesConditionSpec extends BaseConditionSpec {
  type: 'includes';
  value: string;
}

export interface ExcludesConditionSpec extends BaseConditionSpec {
  type: 'excludes';
  value: string;
}

export interface LessThanConditionSpec extends BaseConditionSpec {
  type: 'lessthan';
  parameters: [number];
  value: string;
}

export interface MinusLessThanConditionSpec extends BaseConditionSpec {
  type: 'minuslessthan';
  parameters: [string, string, number];
}

export interface HasOwnPropertyConditionSpec extends BaseConditionSpec {
  type: 'hasOwnProperty';
  parameters: [string];
}

export interface MoreThanObjectKeysLengthConditionSpec extends BaseConditionSpec {
  type: 'morethan.Object.keys.length';
  parameters: [number];
  value: string;
}

export interface EqualConditionSpec extends BaseConditionSpec {
  type: 'equal';
  value: string | null;
}

export interface IncludesExcludesConditionSpec extends BaseConditionSpec {
  includes?: string | string[];
  excludes?: string | string[];
}

export type ConditionSpec =
  | IncludesConditionSpec
  | ExcludesConditionSpec
  | LessThanConditionSpec
  | MinusLessThanConditionSpec
  | HasOwnPropertyConditionSpec
  | MoreThanObjectKeysLengthConditionSpec
  | EqualConditionSpec
  | IncludesExcludesConditionSpec;

export type PatternSpec = string | ConditionSpec | ConditionSpec[];

export interface PatternsSpec {
  special: Record<number, PatternSpec>;
  available: {
    notfound: Record<number, PatternSpec>;
    nomatch: Record<number, PatternSpec>;
    available: Record<number, PatternSpec>;
    unique: Record<number, PatternSpec>;
  };
  unavailable: Record<number, PatternSpec>;
  error: {
    nocontent: Record<number, PatternSpec>;
    unauthorized: Record<number, PatternSpec>;
    ratelimiting: Record<number, PatternSpec>;
  };
}

export const builtPatterns: PatternCollections = {
  special: [],
  available: [],
  unavailable: [],
  error: []
};

const patterns: PatternsSpec = {
  // Special cases
  special: {
    1: {
      includes: ['Uniregistry', 'Query limit exceeded'],
      result: appSettings.lookupAssumptions.uniregistry ? 'unavailable' : 'error:ratelimiting'
    }
  },

  // Available cases
  available: {
    // Not found messages
    notfound: {
      //X: 'ERROR:101: no entries found',
      1: 'NOT FOUND',
      2: 'Not found: ',
      3: ' not found',
      4: 'Not found',
      5: 'No Data Found',
      6: 'nothing found',
      7: 'Nothing found for',
      8: {
        includes: 'No entries found',
        excludes: 'ERROR:101:'
      },
      9: 'Domain Status: No Object Found',
      10: 'DOMAIN NOT FOUND',
      11: 'Domain Not Found',
      12: 'Domain not found',
      13: 'NO OBJECT FOUND!'
    },

    // No match for domain
    nomatch: {
      1: 'No match for domain',
      2: '- No Match',
      3: 'NO MATCH:',
      4: 'No match for',
      5: 'No match',
      6: 'No matching record.',
      7: 'Nincs talalat'
    },

    // Available status
    available: {
      1: 'Status: AVAILABLE',
      2: 'Status:             AVAILABLE',
      3: 'Status: 	available',
      4: 'Status: free',
      5: 'Status: Not Registered',
      6: 'query_status: 220 Available'
    },

    // Unique cases
    unique: {
      1: [
        {
          type: 'minuslessthan',
          parameters: ['domainParams.expiryDate', 'controlDate', 0],
          result: appSettings.lookupAssumptions.expired ? 'expired' : 'available'
        }
      ],
      2: 'This domain name has not been registered',
      3: 'The domain has not been registered',
      4: 'This query returned 0 objects',
      5: [
        {
          type: 'includes',
          value: ' is free'
        },
        {
          type: 'lessthan',
          parameters: [50],
          value: 'domainParams.whoisreply.length'
        }
      ],
      6: 'domain name not known in',
      7: 'registration status: available',
      8: [
        {
          type: 'includes',
          value: 'whois.nic.bo'
        },
        {
          type: 'lessthan',
          parameters: [55],
          value: 'domainParams.whoisreply.length'
        }
      ],
      9: 'Object does not exist',
      10: 'The queried object does not exist',
      11: 'Not Registered -',
      12: 'is available for registration',
      13: 'is available for purchase',
      14: 'DOMAIN IS NOT A REGISTERD',
      15: 'No such domain',
      16: 'No_Se_Encontro_El_Objeto',
      17: 'Domain unknown',
      18: 'No information available about domain name',
      19: [
        {
          type: 'includes',
          value: 'Error.'
        },
        {
          type: 'includes',
          value: 'SaudiNIC'
        }
      ],
      20: 'is not valid!' // returned when the queried domain fails validation
    }
  },

  // Unavailable domain
  unavailable: {
    1: [
      {
        type: 'hasOwnProperty',
        parameters: ['domainName']
      }
    ],
    2: 'Domain Status:ok',
    3: 'Expiration Date:',
    4: 'Expiry Date:',
    5: 'Status: connect',
    6: 'Changed:',
    7: [
      {
        type: 'morethan.Object.keys.length',
        parameters: [5],
        value: 'resultsJSON'
      }
    ],
    8: 'organisation: Internet Assigned Numbers Authority'
  },

  // Error domain
  error: {
    // Null or no content
    nocontent: {
      1: [
        {
          type: 'equal',
          value: null
        }
      ],
      2: [
        {
          type: 'equal',
          value: ''
        }
      ]
    },

    // Unauthorized
    unauthorized: {
      1: 'You  are  not  authorized  to  access or query our Whois'
    },

    // Rate limiting
    ratelimiting: {
      1: 'IP Address Has Reached Rate Limit',
      2: 'Too many connection attempts',
      3: 'Your request is being rate limited',
      4: 'Your query is too often.',
      5: 'Your connection limit exceeded.'
    }
  }
};

function resolvePath(path: string, context: PatternContext): unknown {
  const parts = path.split('.');
  let value: unknown;
  switch (parts.shift()) {
    case 'domainParams':
      value = context.domainParams;
      break;
    case 'resultsJSON':
      value = context.resultsJSON;
      break;
    case 'resultsText':
      value = context.resultsText;
      break;
    case 'controlDate':
      value = context.controlDate;
      break;
    default:
      return undefined;
  }
  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function compileCondition(cond: ConditionSpec): PatternFunction {
  if ('type' in cond) {
    switch (cond.type) {
      case 'includes':
        if ('value' in cond) {
          return (ctx) => ctx.resultsText.includes(cond.value);
        }
        break;
      case 'excludes':
        if ('value' in cond) {
          return (ctx) => !ctx.resultsText.includes(cond.value);
        }
        break;
      case 'lessthan':
        if ('parameters' in cond && 'value' in cond) {
          return (ctx) => {
            const v = resolvePath(cond.value, ctx);
            return Number(v) < cond.parameters[0];
          };
        }
        break;
      case 'minuslessthan':
        if ('parameters' in cond) {
          return (ctx) => {
            const v1 = resolvePath(cond.parameters[0], ctx);
            const v2 = resolvePath(cond.parameters[1], ctx);
            const diff = Date.parse(v1 as string) - Date.parse(v2 as string);
            return diff < cond.parameters[2];
          };
        }
        break;
      case 'hasOwnProperty':
        if ('parameters' in cond) {
          return (ctx) =>
            ctx.resultsJSON &&
            Object.prototype.hasOwnProperty.call(ctx.resultsJSON, cond.parameters[0]);
        }
        break;
      case 'morethan.Object.keys.length':
        if ('value' in cond && 'parameters' in cond) {
          return (ctx) => {
            const obj = resolvePath(cond.value, ctx) as Record<string, unknown> | undefined;
            return !!obj && Object.keys(obj).length > cond.parameters[0];
          };
        }
        break;
      case 'equal':
        if ('value' in cond) {
          return (ctx) => ctx.resultsText === cond.value;
        }
        break;
      default:
        return () => false;
    }
  }

  return (ctx) => {
    let ok = true;
    if ('includes' in cond && cond.includes) {
      if (Array.isArray(cond.includes)) {
        ok = cond.includes.every((s: string) => ctx.resultsText.includes(s));
      } else {
        ok = ctx.resultsText.includes(cond.includes);
      }
    }
    if (ok && 'excludes' in cond && cond.excludes) {
      if (Array.isArray(cond.excludes)) {
        ok = !cond.excludes.some((s: string) => ctx.resultsText.includes(s));
      } else {
        ok = !ctx.resultsText.includes(cond.excludes);
      }
    }
    return ok;
  };
}

function compileSpec(spec: PatternSpec, defaultResult: string): CompiledPattern {
  let result = defaultResult;
  let conditions: PatternFunction[] = [];
  if (typeof spec === 'string') {
    conditions = [compileCondition({ type: 'includes', value: spec })];
  } else if (Array.isArray(spec)) {
    conditions = spec.map((c) => compileCondition(c));
    const withResult = spec.find((c) => (c as BaseConditionSpec).result !== undefined);
    if (withResult && (withResult as BaseConditionSpec).result !== undefined)
      result = (withResult as BaseConditionSpec).result as string;
  } else {
    conditions = [compileCondition(spec)];
    if (spec.result !== undefined) result = spec.result;
  }

  return {
    fn: (ctx) => conditions.every((f) => f(ctx)),
    result
  };
}

export function buildPatterns(): void {
  builtPatterns.special = [];
  builtPatterns.available = [];
  builtPatterns.unavailable = [];
  builtPatterns.error = [];

  for (const spec of Object.values(patterns.special)) {
    const res =
      typeof spec !== 'string' && !Array.isArray(spec) && spec.result !== undefined
        ? spec.result
        : '';
    builtPatterns.special.push(compileSpec(spec, res));
  }

  const avail = patterns.available;
  for (const cat of ['notfound', 'nomatch', 'available', 'unique'] as const) {
    const group = avail[cat];
    for (const spec of Object.values(group)) {
      builtPatterns.available.push(compileSpec(spec, 'available'));
    }
  }

  const unav = patterns.unavailable;
  for (const spec of Object.values(unav)) {
    builtPatterns.unavailable.push(compileSpec(spec, 'unavailable'));
  }

  const err = patterns.error;
  const errMap: { [key: string]: string } = {
    nocontent: 'error:nocontent',
    unauthorized: 'error:unauthorized',
    ratelimiting: 'error:ratelimiting'
  };
  for (const groupKey in err) {
    const group = err[groupKey as keyof typeof err];
    const res = errMap[groupKey];
    for (const spec of Object.values(group)) {
      builtPatterns.error.push(compileSpec(spec, res));
    }
  }
}

export function checkPatterns(resultsText: string, resultsJSON?: Record<string, unknown>): string {
  if (!builtPatterns.available.length) buildPatterns();

  resultsJSON = resultsJSON ?? (toJSON(resultsText) as Record<string, unknown>);
  const domainParams = getDomainParameters(null, null, resultsText, resultsJSON, true);
  const controlDate = getDate(new Date());
  const ctx: PatternContext = {
    resultsText,
    resultsJSON,
    domainParams,
    controlDate
  };

  for (const p of builtPatterns.special) if (p.fn(ctx)) return p.result;
  for (const p of builtPatterns.available) if (p.fn(ctx)) return p.result;
  for (const p of builtPatterns.unavailable) if (p.fn(ctx)) return p.result;
  for (const p of builtPatterns.error) if (p.fn(ctx)) return p.result;

  return appSettings.lookupAssumptions.unparsable ? 'available' : 'error:unparsable';
}

const exported = {
  buildPatterns,
  build: buildPatterns,
  checkPatterns,
  check: checkPatterns
};

export default patterns;
export { exported as PatternsHelpers };

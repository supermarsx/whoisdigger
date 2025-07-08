import { settings as appSettings, Settings } from '../settings.js';
import { toJSON } from '../parser.js';
import { getDomainParameters, WhoisResult } from '../availability.js';
import { getDate } from '../conversions.js';
import patterns from './patternData.js';

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

  for (const key of Object.keys(patterns.special).sort((a, b) => Number(a) - Number(b))) {
    const spec = patterns.special[Number(key) as keyof typeof patterns.special];
    const res =
      typeof spec !== 'string' && !Array.isArray(spec) && spec.result !== undefined
        ? spec.result
        : '';
    builtPatterns.special.push(compileSpec(spec, res));
  }

  const avail = patterns.available;
  for (const cat of ['notfound', 'nomatch', 'available', 'unique'] as const) {
    const group = avail[cat];
    for (const key of Object.keys(group).sort((a, b) => Number(a) - Number(b))) {
      const spec = group[Number(key) as keyof typeof group];
      builtPatterns.available.push(compileSpec(spec, 'available'));
    }
  }

  const unav = patterns.unavailable;
  for (const key of Object.keys(unav).sort((a, b) => Number(a) - Number(b))) {
    const spec = unav[Number(key) as keyof typeof unav];
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
    for (const key of Object.keys(group).sort((a, b) => Number(a) - Number(b))) {
      const spec = group[Number(key) as keyof typeof group];
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

// Rebuild patterns when settings change in the renderer
const win = typeof window !== 'undefined' ? (window as any) : undefined;
const electron = win?.electron;
if (electron?.on) {
  electron.on('settings:reloaded', () => {
    buildPatterns();
  });
}
// Fallback DOM event used by renderer settings page
if (win?.addEventListener) {
  win.addEventListener('settings-reloaded', () => {
    buildPatterns();
  });
}

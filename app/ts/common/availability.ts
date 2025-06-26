import debugModule from 'debug';
import { getDate } from './conversions';
import { toJSON } from './parser';
import { settings as appSettings, Settings } from './settings';
import { checkPatterns } from './whoiswrapper/patterns';
import { predict as aiPredict } from '../ai/availabilityModel';

const debug = debugModule('common.whoisWrapper');
let settings: Settings = appSettings;

export interface WhoisResult {
  domain?: string;
  status?: string;
  registrar?: string;
  company?: string;
  creationDate?: string | undefined;
  updateDate?: string | undefined;
  expiryDate?: string | undefined;
  whoisreply?: string;
  whoisJson?: Record<string, unknown>;
}

interface CheckContext {
  resultsText: string;
  resultsJSON: Record<string, unknown>;
  domainParams: WhoisResult;
  controlDate: string | undefined;
}

type CheckFn = (ctx: CheckContext) => boolean;

const AVAILABLE_PATTERNS: string[] = [
  'No match for domain',
  '- No Match',
  'NO MATCH:',
  'No match for',
  'No match',
  'No matching record.',
  'Nincs talalat',
  'Status: AVAILABLE',
  'Status:             AVAILABLE',
  'Status:         available',
  'Status: free',
  'Status: Not Registered',
  'query_status: 220 Available',
  'This domain name has not been registered',
  'The domain has not been registered',
  'This query returned 0 objects',
  'domain name not known in',
  'registration status: available',
  'Object does not exist',
  'The queried object does not exist',
  'Not Registered -',
  'is available for registration',
  'is available for purchase',
  'DOMAIN IS NOT A REGISTERD',
  'No such domain',
  'No_Se_Encontro_El_Objeto',
  'Domain unknown',
  'No information available about domain name',
  'is not valid!'
];

const AVAILABLE_FUNCTIONS: CheckFn[] = [
  (ctx) =>
    ctx.domainParams.expiryDate !== undefined &&
    ctx.controlDate !== undefined &&
    Date.parse(ctx.domainParams.expiryDate) - Date.parse(ctx.controlDate) < 0,
  (ctx) =>
    ctx.resultsText.includes(' is free') &&
    ctx.domainParams.whoisreply !== undefined &&
    ctx.domainParams.whoisreply.length < 50,
  (ctx) =>
    ctx.resultsText.includes('whois.nic.bo') &&
    ctx.domainParams.whoisreply !== undefined &&
    ctx.domainParams.whoisreply.length < 55,
  (ctx) => ctx.resultsText.includes('Error.') && ctx.resultsText.includes('SaudiNIC')
];

const UNAVAILABLE_PATTERNS: string[] = [
  'Domain Status:ok',
  'Expiration Date:',
  'Expiry Date:',
  'Status: connect',
  'Changed:',
  'organisation: Internet Assigned Numbers Authority'
];

const UNAVAILABLE_FUNCTIONS: CheckFn[] = [
  (ctx) => Object.prototype.hasOwnProperty.call(ctx.resultsJSON, 'domainName'),
  (ctx) => Object.keys(ctx.resultsJSON).length > 5
];

const ERROR_CHECKS: { result: string; strings?: string[]; fn?: CheckFn }[] = [
  { result: 'error:nocontent', fn: (ctx) => ctx.resultsText === null || ctx.resultsText === '' },
  {
    result: 'error:unauthorized',
    strings: ['You  are  not  authorized  to  access or query our Whois']
  },
  {
    result: 'error:ratelimiting',
    strings: [
      'IP Address Has Reached Rate Limit',
      'Too many connection attempts',
      'Your request is being rate limited',
      'Your query is too often.',
      'Your connection limit exceeded.'
    ]
  },
  { result: 'error:unretrivable', strings: ['Could not retrieve Whois data'] },
  {
    result: 'error:forbidden',
    strings: ['si is forbidden', 'Requests of this client are not permitted']
  },
  { result: 'error:reservedbyregulator', strings: ['reserved by aeDA Regulator'] },
  { result: 'error:unregistrable', strings: ['third-level domains may not start with'] },
  {
    result: 'error:replyerror',
    strings: [
      'error ',
      'error',
      'Error',
      'ERROR:101:',
      'Whois lookup error',
      'can temporarily not be answered',
      'Invalid input'
    ],
    fn: (ctx) =>
      Object.prototype.hasOwnProperty.call(ctx.resultsJSON, 'error') ||
      Object.prototype.hasOwnProperty.call(ctx.resultsJSON, 'errno')
  }
];

export function isDomainAvailable(
  resultsText: string,
  resultsJSON?: Record<string, unknown>
): string {
  const { lookupAssumptions: assumptions } = settings;

  if (settings.ai.enabled) {
    try {
      const aiRes = aiPredict(resultsText);
      if (aiRes === 'available' || aiRes === 'unavailable') return aiRes;
    } catch (e) {
      debug(`AI prediction failed: ${e}`);
    }
  }

  const patternResult = checkPatterns(resultsText, resultsJSON);
  const defaultResult = assumptions.unparsable ? 'available' : 'error:unparsable';
  if (patternResult !== defaultResult) return patternResult;

  if (!resultsJSON) resultsJSON = toJSON(resultsText) as Record<string, unknown>;

  const domainParams = getDomainParameters(null, null, null, resultsJSON, true);
  const controlDate = getDate(new Date());

  if (resultsText.includes('Uniregistry') && resultsText.includes('Query limit exceeded')) {
    return assumptions.uniregistry ? 'unavailable' : 'error:ratelimiting';
  }

  const ctx: CheckContext = {
    resultsText,
    resultsJSON,
    domainParams,
    controlDate
  };

  for (const p of AVAILABLE_PATTERNS) {
    if (resultsText.includes(p)) return 'available';
  }
  for (const fn of AVAILABLE_FUNCTIONS) {
    if (fn(ctx)) return 'available';
  }

  for (const p of UNAVAILABLE_PATTERNS) {
    if (resultsText.includes(p)) return 'unavailable';
  }
  for (const fn of UNAVAILABLE_FUNCTIONS) {
    if (fn(ctx)) return 'unavailable';
  }

  for (const check of ERROR_CHECKS) {
    if (check.fn && check.fn(ctx)) return check.result;
    if (check.strings) {
      for (const s of check.strings) if (resultsText.includes(s)) return check.result;
    }
  }

  return assumptions.unparsable ? 'available' : 'error:unparsable';
}

export function getDomainParameters(
  domain: string | null,
  status: string | null,
  resultsText: string | null,
  resultsJSON: Record<string, unknown>,
  isAuxiliary = false
): WhoisResult {
  const results: WhoisResult = {};

  results.domain = domain ?? undefined;
  results.status = status ?? undefined;
  results.registrar = resultsJSON.registrar as string | undefined;
  results.company =
    (resultsJSON.registrantOrganization as string | undefined) ||
    (resultsJSON.registrant as string | undefined) ||
    (resultsJSON.adminName as string | undefined) ||
    (resultsJSON.ownerName as string | undefined) ||
    (resultsJSON.contact as string | undefined) ||
    (resultsJSON.name as string | undefined);
  results.creationDate = getDate(
    (resultsJSON.creationDate as string | boolean | Date | undefined) ||
      (resultsJSON.createdDate as string | boolean | Date | undefined) ||
      (resultsJSON.created as string | boolean | Date | undefined) ||
      (resultsJSON.registered as string | boolean | Date | undefined) ||
      (resultsJSON.registeredOn as string | boolean | Date | undefined)
  );
  results.updateDate = getDate(
    (resultsJSON.updatedDate as string | boolean | Date | undefined) ||
      (resultsJSON.lastUpdated as string | boolean | Date | undefined) ||
      (resultsJSON.UpdatedDate as string | boolean | Date | undefined) ||
      (resultsJSON.changed as string | boolean | Date | undefined) ||
      (resultsJSON.lastModified as string | boolean | Date | undefined) ||
      (resultsJSON.lastUpdate as string | boolean | Date | undefined)
  );
  results.expiryDate = getDate(
    (resultsJSON.expires as string | boolean | Date | undefined) ||
      (resultsJSON.registryExpiryDate as string | boolean | Date | undefined) ||
      (resultsJSON.expiryDate as string | boolean | Date | undefined) ||
      (resultsJSON.registrarRegistrationExpirationDate as string | boolean | Date | undefined) ||
      (resultsJSON.expire as string | boolean | Date | undefined) ||
      (resultsJSON.expirationDate as string | boolean | Date | undefined) ||
      (resultsJSON.expiresOn as string | boolean | Date | undefined) ||
      (resultsJSON.paidTill as string | boolean | Date | undefined)
  );
  results.whoisreply = resultsText ?? undefined;
  results.whoisJson = resultsJSON;

  return results;
}

export default {
  isDomainAvailable,
  getDomainParameters
};

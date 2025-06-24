import debugModule from 'debug';
import { getDate } from './conversions';
import { toJSON } from './parser';
import { settings as appSettings, Settings } from './settings';

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

export function isDomainAvailable(
  resultsText: string,
  resultsJSON?: Record<string, unknown>
): string {
  const { 'lookup.assumptions': assumptions } = settings;

  if (!resultsJSON) resultsJSON = toJSON(resultsText) as Record<string, unknown>;

  const domainParams = getDomainParameters(null, null, null, resultsJSON, true);
  const controlDate = getDate(new Date());

  switch (true) {
    case resultsText.includes('Uniregistry') && resultsText.includes('Query limit exceeded'):
      return assumptions.uniregistry ? 'unavailable' : 'error:ratelimiting';

    case resultsText.includes('No match for domain'):
    case resultsText.includes('- No Match'):
    case resultsText.includes('NO MATCH:'):
    case resultsText.includes('No match for'):
    case resultsText.includes('No match'):
    case resultsText.includes('No matching record.'):
    case resultsText.includes('Nincs talalat'):
    case resultsText.includes('Status: AVAILABLE'):
    case resultsText.includes('Status:             AVAILABLE'):
    case resultsText.includes('Status:         available'):
    case resultsText.includes('Status: free'):
    case resultsText.includes('Status: Not Registered'):
    case resultsText.includes('query_status: 220 Available'):
    case domainParams.expiryDate !== undefined &&
      controlDate !== undefined &&
      Date.parse(domainParams.expiryDate) - Date.parse(controlDate) < 0:
    case resultsText.includes('This domain name has not been registered'):
    case resultsText.includes('The domain has not been registered'):
    case resultsText.includes('This query returned 0 objects'):
    case resultsText.includes(' is free') &&
      domainParams.whoisreply !== undefined &&
      domainParams.whoisreply.length < 50:
    case resultsText.includes('domain name not known in'):
    case resultsText.includes('registration status: available'):
    case resultsText.includes('whois.nic.bo') &&
      domainParams.whoisreply !== undefined &&
      domainParams.whoisreply.length < 55:
    case resultsText.includes('Object does not exist'):
    case resultsText.includes('The queried object does not exist'):
    case resultsText.includes('Not Registered -'):
    case resultsText.includes('is available for registration'):
    case resultsText.includes('is available for purchase'):
    case resultsText.includes('DOMAIN IS NOT A REGISTERD'):
    case resultsText.includes('No such domain'):
    case resultsText.includes('No_Se_Encontro_El_Objeto'):
    case resultsText.includes('Domain unknown'):
    case resultsText.includes('No information available about domain name'):
    case resultsText.includes('Error.') && resultsText.includes('SaudiNIC'):
    case resultsText.includes('is not valid!'):
      return 'available';

    case resultsJSON.hasOwnProperty('domainName'):
    case resultsText.includes('Domain Status:ok'):
    case resultsText.includes('Expiration Date:'):
    case resultsText.includes('Expiry Date:'):
    case resultsText.includes('Status: connect'):
    case resultsText.includes('Changed:'):
    case Object.keys(resultsJSON).length > 5:
    case resultsText.includes('organisation: Internet Assigned Numbers Authority'):
      return 'unavailable';

    case resultsText === null:
    case resultsText === '':
      return 'error:nocontent';

    case resultsText.includes('You  are  not  authorized  to  access or query our Whois'):
      return 'error:unauthorized';

    case resultsText.includes('IP Address Has Reached Rate Limit'):
    case resultsText.includes('Too many connection attempts'):
    case resultsText.includes('Your request is being rate limited'):
    case resultsText.includes('Your query is too often.'):
    case resultsText.includes('Your connection limit exceeded.'):
      return assumptions.ratelimit ? 'unavailable' : 'error:ratelimiting';

    case resultsText.includes('Could not retrieve Whois data'):
      return 'error:unretrivable';

    case resultsText.includes('si is forbidden'):
    case resultsText.includes('Requests of this client are not permitted'):
      return 'error:forbidden';

    case resultsText.includes('reserved by aeDA Regulator'):
      return 'error:reservedbyregulator';

    case resultsText.includes('third-level domains may not start with'):
      return 'error:unregistrable';

    case resultsJSON.hasOwnProperty('error'):
    case resultsJSON.hasOwnProperty('errno'):
    case resultsText.includes('error '):
    case resultsText.includes('error'):
    case resultsText.includes('Error'):
    case resultsText.includes('ERROR:101:'):
    case resultsText.includes('Whois lookup error'):
    case resultsText.includes('can temporarily not be answered'):
    case resultsText.includes('Invalid input'):
      return 'error:replyerror';

    default:
      return assumptions.unparsable ? 'available' : 'error:unparsable';
  }
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

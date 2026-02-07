/**
 * Tests for app/ts/common/availability.ts — isDomainAvailable & getDomainParameters
 *
 * These are core business logic tests that validate domain status classification
 * from raw WHOIS text.
 */
import DomainStatus from '../app/ts/common/status.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

// We need to mock settings, logger, ai model, and the pattern checker
// before importing the module under test.
jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {}
}));

jest.mock('../app/ts/ai/availabilityModel.js', () => ({
  predict: jest.fn(() => null)
}));

jest.mock('../app/ts/common/whoiswrapper/patterns.js', () => {
  const mockDomainStatus = require('../app/ts/common/status.js').default;
  return {
    checkPatterns: jest.fn(() => mockDomainStatus.ErrorUnparsable)
  };
});

jest.mock('../app/ts/common/settings.js', () => ({
  settings: {
    ai: { enabled: false },
    lookupAssumptions: {
      uniregistry: false,
      ratelimit: false,
      unparsable: false,
      dnsFailureUnavailable: false
    }
  },
  Settings: {}
}));

import { isDomainAvailable, getDomainParameters } from '../app/ts/common/availability.js';
import { predict as aiPredict } from '../app/ts/ai/availabilityModel.js';

const mockSettings = jest.requireMock('../app/ts/common/settings.js');

// ── isDomainAvailable ──────────────────────────────────────────────────────

describe('isDomainAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings.settings.ai.enabled = false;
    mockSettings.settings.lookupAssumptions.unparsable = false;
    mockSettings.settings.lookupAssumptions.uniregistry = false;
  });

  // ── Available patterns ─────────────────────────────────────────────────

  describe('available patterns', () => {
    const availableTexts = [
      'No match for domain "example.com".',
      '- No Match for that query',
      'NO MATCH: example.com',
      'No match for "example.com".',
      'No match',
      'No matching record.',
      'Nincs talalat',
      'Status: AVAILABLE',
      'Status:             AVAILABLE',
      'Status:         available',
      'Status: free',
      'Status: Not Registered',
      'query_status: 220 Available',
      'This domain name has not been registered.',
      'The domain has not been registered.',
      'This query returned 0 objects.',
      'domain name not known in .xyz',
      'registration status: available',
      'Object does not exist',
      'The queried object does not exist: example.com',
      'Not Registered - example.com',
      'example.com is available for registration',
      'example.com is available for purchase',
      'DOMAIN IS NOT A REGISTERD DOMAIN',
      'No such domain example.com',
      'No_Se_Encontro_El_Objeto/No_Object_Found',
      'Domain unknown',
      'No information available about domain name',
      'example.invalid is not valid!'
    ];

    test.each(availableTexts)(
      'returns Available for text containing: %s',
      (text) => {
        expect(isDomainAvailable(text)).toBe(DomainStatus.Available);
      }
    );
  });

  // ── Unavailable patterns ───────────────────────────────────────────────

  describe('unavailable patterns', () => {
    const unavailableTexts = [
      'Domain Status:ok\nRegistrar: Example LLC',
      'Expiration Date: 2030-01-01',
      'Expiry Date: 2030-01-01',
      'Status: connect',
      'Changed: 2023-01-01\nSome extra content to avoid error patterns',
      'organisation: Internet Assigned Numbers Authority'
    ];

    test.each(unavailableTexts)(
      'returns Unavailable for text containing: %s',
      (text) => {
        expect(isDomainAvailable(text)).toBe(DomainStatus.Unavailable);
      }
    );
  });

  // ── Error patterns ─────────────────────────────────────────────────────

  describe('error patterns', () => {
    test('returns error:nocontent for empty string', () => {
      expect(isDomainAvailable('')).toBe(DomainStatus.ErrorNoContent);
    });

    test('returns error:unauthorized for unauthorized message', () => {
      expect(
        isDomainAvailable('You  are  not  authorized  to  access or query our Whois database')
      ).toBe(DomainStatus.ErrorUnauthorized);
    });

    test('returns error:ratelimiting for rate-limited messages', () => {
      const rateTexts = [
        'IP Address Has Reached Rate Limit',
        'Too many connection attempts. Please try again later.',
        'Your request is being rate limited',
        'Your query is too often.',
        'Your connection limit exceeded.'
      ];
      for (const text of rateTexts) {
        expect(isDomainAvailable(text)).toBe(DomainStatus.ErrorRateLimiting);
      }
    });

    test('returns error:unretrivable for unretrievable message', () => {
      expect(isDomainAvailable('Could not retrieve Whois data')).toBe(
        DomainStatus.ErrorUnretrievable
      );
    });

    test('returns error:forbidden for forbidden messages', () => {
      expect(isDomainAvailable('si is forbidden')).toBe(DomainStatus.ErrorForbidden);
      expect(isDomainAvailable('Requests of this client are not permitted')).toBe(
        DomainStatus.ErrorForbidden
      );
    });

    test('returns error:reservedbyregulator', () => {
      expect(isDomainAvailable('reserved by aeDA Regulator')).toBe(
        DomainStatus.ErrorReservedByRegulator
      );
    });

    test('returns error:unregistrable', () => {
      expect(isDomainAvailable('third-level domains may not start with')).toBe(
        DomainStatus.ErrorUnregistrable
      );
    });

    test('returns error:replyerror for generic errors', () => {
      expect(isDomainAvailable('ERROR:101: Something')).toBe(DomainStatus.ErrorReplyError);
      expect(isDomainAvailable('Whois lookup error for domain')).toBe(
        DomainStatus.ErrorReplyError
      );
      expect(isDomainAvailable('can temporarily not be answered')).toBe(
        DomainStatus.ErrorReplyError
      );
      expect(isDomainAvailable('Invalid input')).toBe(DomainStatus.ErrorReplyError);
    });
  });

  // ── Uniregistry special case ──────────────────────────────────────────

  describe('Uniregistry special case', () => {
    const uniText = 'Uniregistry Corp. Query limit exceeded for this IP';

    test('returns ErrorRateLimiting when uniregistry assumption is false', () => {
      mockSettings.settings.lookupAssumptions.uniregistry = false;
      expect(isDomainAvailable(uniText)).toBe(DomainStatus.ErrorRateLimiting);
    });

    test('returns Unavailable when uniregistry assumption is true', () => {
      mockSettings.settings.lookupAssumptions.uniregistry = true;
      expect(isDomainAvailable(uniText)).toBe(DomainStatus.Unavailable);
    });
  });

  // ── Fallback behavior ─────────────────────────────────────────────────

  describe('fallback / unparsable', () => {
    test('returns ErrorUnparsable when unparsable assumption is false', () => {
      mockSettings.settings.lookupAssumptions.unparsable = false;
      expect(isDomainAvailable('some completely random text with no patterns')).toBe(
        DomainStatus.ErrorUnparsable
      );
    });

    test('returns Available when unparsable assumption is true', () => {
      mockSettings.settings.lookupAssumptions.unparsable = true;
      // When unparsable=true, defaultResult=Available; checkPatterns must
      // return the same default so the short-circuit `patternResult !== defaultResult`
      // does NOT fire and execution falls through to the final return.
      const { checkPatterns } = jest.requireMock('../app/ts/common/whoiswrapper/patterns.js');
      checkPatterns.mockReturnValueOnce(DomainStatus.Available);
      expect(isDomainAvailable('some completely random text with no patterns')).toBe(
        DomainStatus.Available
      );
    });
  });

  // ── AI integration ────────────────────────────────────────────────────

  describe('AI prediction', () => {
    test('uses AI result when enabled and returns a valid status', () => {
      mockSettings.settings.ai.enabled = true;
      (aiPredict as jest.Mock).mockReturnValue(DomainStatus.Available);
      expect(isDomainAvailable('anything')).toBe(DomainStatus.Available);
      expect(aiPredict).toHaveBeenCalledWith('anything');
    });

    test('falls through when AI returns null', () => {
      mockSettings.settings.ai.enabled = true;
      (aiPredict as jest.Mock).mockReturnValue(null);
      // 'No match' will match an available pattern
      expect(isDomainAvailable('No match')).toBe(DomainStatus.Available);
    });

    test('falls through when AI throws', () => {
      mockSettings.settings.ai.enabled = true;
      (aiPredict as jest.Mock).mockImplementation(() => {
        throw new Error('model not loaded');
      });
      expect(isDomainAvailable('No match')).toBe(DomainStatus.Available);
    });

    test('is not called when AI is disabled', () => {
      mockSettings.settings.ai.enabled = false;
      isDomainAvailable('something');
      expect(aiPredict).not.toHaveBeenCalled();
    });
  });
});

// ── getDomainParameters ────────────────────────────────────────────────────

describe('getDomainParameters', () => {
  test('extracts registrar from WHOIS JSON', () => {
    const json = { registrar: 'GoDaddy LLC' };
    const result = getDomainParameters('example.com', DomainStatus.Unavailable, 'raw', json);
    expect(result.registrar).toBe('GoDaddy LLC');
    expect(result.domain).toBe('example.com');
    expect(result.status).toBe(DomainStatus.Unavailable);
  });

  test('extracts company from registrantOrganization', () => {
    const json = { registrantOrganization: 'ACME Corp' };
    const result = getDomainParameters(null, null, null, json);
    expect(result.company).toBe('ACME Corp');
  });

  test('falls back through company field chain', () => {
    expect(getDomainParameters(null, null, null, { registrant: 'A' }).company).toBe('A');
    expect(getDomainParameters(null, null, null, { adminName: 'B' }).company).toBe('B');
    expect(getDomainParameters(null, null, null, { ownerName: 'C' }).company).toBe('C');
    expect(getDomainParameters(null, null, null, { contact: 'D' }).company).toBe('D');
    expect(getDomainParameters(null, null, null, { name: 'E' }).company).toBe('E');
  });

  test('extracts creation date variants', () => {
    expect(
      getDomainParameters(null, null, null, { creationDate: '2020-01-01' }).creationDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { createdDate: '2020-01-01' }).creationDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { created: '2020-01-01' }).creationDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { registered: '2020-01-01' }).creationDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { registeredOn: '2020-01-01' }).creationDate
    ).toBeDefined();
  });

  test('extracts expiry date variants', () => {
    expect(
      getDomainParameters(null, null, null, { expires: '2030-01-01' }).expiryDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { registryExpiryDate: '2030-01-01' }).expiryDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { expiryDate: '2030-01-01' }).expiryDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { paidTill: '2030-01-01' }).expiryDate
    ).toBeDefined();
  });

  test('extracts update date variants', () => {
    expect(
      getDomainParameters(null, null, null, { updatedDate: '2023-06-01' }).updateDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { lastUpdated: '2023-06-01' }).updateDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { changed: '2023-06-01' }).updateDate
    ).toBeDefined();
    expect(
      getDomainParameters(null, null, null, { lastModified: '2023-06-01' }).updateDate
    ).toBeDefined();
  });

  test('stores raw whois reply', () => {
    const result = getDomainParameters('x.com', null, 'raw whois text', {});
    expect(result.whoisreply).toBe('raw whois text');
  });

  test('stores whois JSON', () => {
    const json = { domainName: 'x.com', registrar: 'Test' };
    const result = getDomainParameters(null, null, null, json);
    expect(result.whoisJson).toEqual(json);
  });

  test('handles empty JSON object', () => {
    const result = getDomainParameters('test.com', DomainStatus.Available, 'raw', {});
    expect(result.domain).toBe('test.com');
    expect(result.registrar).toBeUndefined();
    expect(result.company).toBeUndefined();
    expect(result.creationDate).toBeUndefined();
    expect(result.expiryDate).toBeUndefined();
  });
});

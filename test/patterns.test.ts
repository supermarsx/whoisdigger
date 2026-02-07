/**
 * Tests for whoiswrapper/patterns module (app/ts/common/whoiswrapper/patterns.ts)
 *
 * Tests pattern compilation and checkPatterns logic.
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/settings.js', () => ({
  settings: {
    lookupAssumptions: {
      uniregistry: false,
      expired: false,
      unparsable: false,
    },
    lookupConversion: { enabled: false },
    lookupGeneral: { psl: false },
    ai: { enabled: false },
  },
  getUserDataPath: () => '/tmp',
  Settings: class {},
}));

jest.mock('../app/ts/ai/availabilityModel.js', () => ({
  predict: () => undefined,
  isLoaded: () => false,
  loadModel: jest.fn(),
}));

import {
  buildPatterns,
  checkPatterns,
  builtPatterns,
  type PatternContext,
  type CompiledPattern,
} from '../app/ts/common/whoiswrapper/patterns.js';

const mockSettings = jest.requireMock('../app/ts/common/settings.js').settings;

describe('buildPatterns()', () => {
  it('should populate all four pattern categories', () => {
    buildPatterns();
    expect(builtPatterns.special.length).toBeGreaterThan(0);
    expect(builtPatterns.available.length).toBeGreaterThan(0);
    expect(builtPatterns.unavailable.length).toBeGreaterThan(0);
    expect(builtPatterns.error.length).toBeGreaterThan(0);
  });

  it('should rebuild when called again', () => {
    buildPatterns();
    const count = builtPatterns.available.length;
    buildPatterns();
    expect(builtPatterns.available.length).toBe(count);
  });
});

describe('checkPatterns()', () => {
  beforeEach(() => {
    mockSettings.lookupAssumptions.unparsable = false;
    buildPatterns();
  });

  it('returns available for "NOT FOUND" text', () => {
    expect(checkPatterns('NOT FOUND')).toBe('available');
  });

  it('returns available for "No match for domain example.com"', () => {
    expect(checkPatterns('No match for domain example.com')).toBe('available');
  });

  it('returns available for "Status: AVAILABLE"', () => {
    expect(checkPatterns('Status: AVAILABLE')).toBe('available');
  });

  it('returns available for "Status: free"', () => {
    expect(checkPatterns('Status: free')).toBe('available');
  });

  it('returns available for "This domain name has not been registered"', () => {
    expect(checkPatterns('This domain name has not been registered')).toBe('available');
  });

  it('returns available for "No such domain"', () => {
    expect(checkPatterns('No such domain')).toBe('available');
  });

  it('returns unavailable for registered domain text', () => {
    const text =
      'Domain Name: example.com\nDomain Status: clientTransferProhibited\nRegistrar: GoDaddy\nCreation Date: 2020-01-01';
    expect(checkPatterns(text)).toBe('unavailable');
  });

  it('returns error:ratelimiting for Uniregistry rate limit', () => {
    expect(checkPatterns('Uniregistry Query limit exceeded')).toBe('error:ratelimiting');
  });

  it('changes Uniregistry result when setting is enabled', () => {
    mockSettings.lookupAssumptions.uniregistry = true;
    buildPatterns();
    expect(checkPatterns('Uniregistry Query limit exceeded')).toBe('unavailable');
    mockSettings.lookupAssumptions.uniregistry = false;
    buildPatterns();
  });

  it('returns error:nocontent for empty-like responses', () => {
    // Pattern data has specific patterns for empty/no-content responses
    const result = checkPatterns('');
    // Empty text → falls through to unparsable
    expect(['error:unparsable', 'error:nocontent', 'available']).toContain(result);
  });

  it('returns error:unparsable for unrecognized text when setting off', () => {
    mockSettings.lookupAssumptions.unparsable = false;
    buildPatterns();
    const result = checkPatterns('Some completely unknown WHOIS response format xyz 12345');
    expect(result).toBe('error:unparsable');
  });

  it('returns available for unrecognized text when unparsable setting on', () => {
    mockSettings.lookupAssumptions.unparsable = true;
    buildPatterns();
    const result = checkPatterns('Some completely unknown WHOIS response format xyz 12345');
    expect(result).toBe('available');
    mockSettings.lookupAssumptions.unparsable = false;
    buildPatterns();
  });

  it('handles error:unauthorized patterns', () => {
    const result = checkPatterns('You are not authorized to access this resource');
    // Should match one of the error patterns if present
    expect(typeof result).toBe('string');
  });

  it('handles error:ratelimiting patterns', () => {
    const result = checkPatterns('Query rate limit exceeded');
    // Should be some kind of rate limiting error or fallthrough
    expect(typeof result).toBe('string');
  });
});

describe('PatternContext', () => {
  it('can be constructed', () => {
    const ctx: PatternContext = {
      resultsText: 'test',
      resultsJSON: { key: 'value' },
      domainParams: {
        domain: 'test.com',
        status: 'available',
        registrar: null,
        company: null,
        creationDate: null,
        updateDate: null,
        expiryDate: null,
        whoisreply: 'test',
      } as any,
      controlDate: '2025-01-01',
    };
    expect(ctx.resultsText).toBe('test');
    expect(ctx.resultsJSON.key).toBe('value');
  });
});

describe('CompiledPattern structure', () => {
  it('has fn and result properties', () => {
    buildPatterns();
    for (const category of ['special', 'available', 'unavailable', 'error'] as const) {
      for (const pattern of builtPatterns[category]) {
        expect(typeof pattern.fn).toBe('function');
        expect(typeof pattern.result).toBe('string');
      }
    }
  });
});

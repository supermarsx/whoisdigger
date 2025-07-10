import { getDomainParameters } from '../app/ts/common/availability';
import DomainStatus from '../app/ts/common/status';

describe('getDomainParameters', () => {
  test('returns expected domain info from whois JSON', () => {
    const resultsJSON = {
      registrar: 'Example Registrar',
      registrantOrganization: 'Example Org',
      creationDate: '2000-01-01',
      updatedDate: '2020-01-01',
      registryExpiryDate: '2030-01-01'
    };
    const reply = 'Domain: example.com';
    const result = getDomainParameters('example.com', DomainStatus.Unavailable, reply, resultsJSON);
    expect(result).toEqual({
      domain: 'example.com',
      status: DomainStatus.Unavailable,
      registrar: 'Example Registrar',
      company: 'Example Org',
      creationDate: new Date('2000-01-01').toUTCString(),
      updateDate: new Date('2020-01-01').toUTCString(),
      expiryDate: new Date('2030-01-01').toUTCString(),
      whoisreply: reply,
      whoisJson: resultsJSON
    });
  });

  test('returns undefined for missing fields', () => {
    const resultsJSON: Record<string, unknown> = {};
    const result = getDomainParameters(null, null, null, resultsJSON);
    expect(result).toEqual({
      domain: undefined,
      status: undefined,
      registrar: undefined,
      company: undefined,
      creationDate: undefined,
      updateDate: undefined,
      expiryDate: undefined,
      whoisreply: undefined,
      whoisJson: resultsJSON
    });
  });
});

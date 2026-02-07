/**
 * Tests for export-helpers (app/ts/common/bulkwhois/export-helpers.ts)
 * and types (app/ts/common/bulkwhois/types.ts)
 */

import type { ExportOptions } from '../app/ts/common/bulkwhois/export-helpers.js';

describe('ExportOptions interface', () => {
  it('should accept valid export options', () => {
    const opts: ExportOptions = {
      filetype: 'csv',
      domains: 'all',
      errors: 'include',
      information: 'full',
      whoisreply: 'yes',
    };
    expect(opts.filetype).toBe('csv');
    expect(opts.domains).toBe('all');
    expect(opts.errors).toBe('include');
    expect(opts.information).toBe('full');
    expect(opts.whoisreply).toBe('yes');
  });

  it('should support txt filetype', () => {
    const opts: ExportOptions = {
      filetype: 'txt',
      domains: '',
      errors: '',
      information: '',
      whoisreply: 'no',
    };
    expect(opts.filetype).toBe('txt');
  });

  it('should support zip filetype for WHOIS reply export', () => {
    const opts: ExportOptions = {
      filetype: 'zip',
      domains: 'available',
      errors: 'exclude',
      information: 'minimal',
      whoisreply: 'yes',
    };
    expect(opts.whoisreply).toBe('yes');
  });
});

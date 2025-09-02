// Default export options values
import { debugFactory } from '../../common/logger.js';
import type { ExportOptions } from '#main/bulkwhois/export-helpers';

const debug = debugFactory('bulkwhois.export.defaults');
debug('loaded');

const defaultExportOptions: ExportOptions = {
  filetype: 'csv', // Filetype to export
  domains: 'available', // Export only available domains
  errors: 'no', // Do not export lookup errors
  information: 'domain', // Export only domain name
  whoisreply: 'no' // Do not include whois replies in export
};

export default defaultExportOptions;

// Default export options values
import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('renderer.bw.export.defaults');
debug('loaded');

const defaultExportOptions = {
  filetype: 'csv', // Filetype to export
  domains: 'available', // Export only available domains
  errors: 'no', // Do not export lookup errors
  information: 'domain', // Export only domain name
  whoisreply: 'no' // Do not include whois replies in export
};

export default defaultExportOptions;

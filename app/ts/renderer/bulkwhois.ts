/* Bulk whois handling */
import './bulkwhois/wordlistinput.js'; // Bulk whois by wordlist input
import './bulkwhois/fileinput.js'; // Bulk whois by file input
import { initialize as initProcess } from './bulkwhois/process.js'; // Bulk whois requests processing
import './bulkwhois/export.js'; // Export processing

import { debugFactory } from '../common/logger.js';

const debug = debugFactory('bulkwhois');
debug('loaded');

initProcess();

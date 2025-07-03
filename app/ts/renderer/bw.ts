/* Bulk whois handling */
import './bw/wordlistinput.js'; // Bulk whois by wordlist input
import './bw/fileinput.js'; // Bulk whois by file input
import './bw/process.js'; // Bulk whois requests processing
import './bw/export.js'; // Export processing

import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.bw');
debug('loaded');

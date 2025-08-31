/* Bulk whois analyser handling */
import './bwa/fileinput.js';
import './bwa/analyser.js';
import './bwa/monitor.js';

import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.bwa');
debug('loaded');

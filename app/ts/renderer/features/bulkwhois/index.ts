/* Bulk whois handling */
import '../../bulkwhois/wordlistinput.js';
import '../../bulkwhois/fileinput.js';
import { initialize as initProcess } from '../../bulkwhois/process.js';
import '../../bulkwhois/export.js';

import { debugFactory } from '../../../common/logger.js';

const debug = debugFactory('renderer.features.bulkwhois');
debug('loaded');

initProcess();

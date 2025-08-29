// Ensure global jQuery and DataTables are available for UMD plugins BEFORE other modules
import 'jquery';
import 'datatables.net';

import './singlewhois.js';
import './bulkwhois.js';
import './bwa.js';
import './darkmode.js';
import './settings.js';
import './to.js';
import './history.js';

import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.index');
debug('loaded');

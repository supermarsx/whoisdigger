import './singlewhois.js';
import './bulkwhois.js';
import './bwa.js';
import './to.js';
import './cache.js';
import './ai.js';
import './history.js';
import './settings.js';
import './i18n.js';
import { RequestCache } from '../common/requestCache.js';
import { settings } from '../common/settings.js';

const requestCache = new RequestCache();
requestCache.startAutoPurge(settings.requestCache.purgeInterval);
process.on('exit', () => requestCache.close());

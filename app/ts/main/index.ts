import './singlewhois.js';
import './bulkwhois.js';
import './bwa.js';
import './to.js';
import './cache.js';
import './ai.js';
import './history.js';
import './settings.js';
import './i18n.js';
import { requestCache } from '../common/requestCacheSingleton.js';
import { settings } from '../common/settings.js';

requestCache.startAutoPurge(settings.requestCache.purgeInterval);

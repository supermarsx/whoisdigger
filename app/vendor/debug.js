import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const debug = require('./debug/browser.cjs');
export default debug;

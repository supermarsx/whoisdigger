/**
 * Bridge barrel — re-exports the public API from all per-concern bridge modules.
 *
 * New code should import from specific bridge modules (e.g. `./whois.js`,
 * `./bulk.js`) for explicit dependency tracking.  This barrel exists for
 * convenience and backward compatibility.
 *
 * @module bridge/index
 */

// Core (event management)
export { listen, unlisten } from './core.js';

// Shared types
export type {
  WhoisResult,
  LookupSettings,
  AvailabilitySettings,
  ProfileEntry,
  ProxySettings,
  HistoryPageResult,
  FileStats,
  FileInfoResult,
  TimeEstimateResult,
} from './types.js';

// WHOIS / DNS / RDAP / availability
export {
  whoisLookup,
  whoisLookupWithSettings,
  dnsLookup,
  rdapLookup,
  availabilityCheck,
  availabilityCheckWithSettings,
  domainParameters,
  whoisParse,
} from './whois.js';

// Bulk WHOIS
export {
  bulkWhoisLookup,
  bulkWhoisPause,
  bulkWhoisContinue,
  bulkWhoisStop,
  bulkWhoisLookupFromFile,
  bulkWhoisExport,
  bulkWhoisLookupFromContent,
} from './bulk.js';

// BWA (Bulk Whois Analyser)
export { bwaAnalyserStart, bwaRenderTableHtml } from './bwa.js';

// Text operations / CSV
export { toProcess, parseCsv, csvParseFile } from './textops.js';

// File dialogs
export {
  openFileDialog,
  saveFileDialog,
  openTextFileDialog,
  openCsvJsonDialog,
  openDbFileDialog,
} from './dialogs.js';

// Settings persistence / config
export { settingsLoad, settingsSave, configDelete, configExport, configImport } from './settings.js';

// Profile management
export {
  profilesList,
  profilesCreate,
  profilesRename,
  profilesDelete,
  profilesSetCurrent,
  profilesExport,
  profilesGetCurrent,
  profilesImport,
} from './profiles.js';

// Proxy / lookup settings
export {
  proxySetSettings,
  proxyGetSettings,
  lookupSetSettings,
  lookupGetSettings,
} from './proxy.js';

// History / cache
export {
  historyGet,
  historyGetFiltered,
  historyClear,
  historyMerge,
  cacheGet,
  cacheSet,
  cacheClear,
  cacheMerge,
} from './history.js';

// Stats
export { statsStart, statsRefresh, statsStop, statsGet } from './stats.js';

// Monitor
export { monitorStart, monitorStop, monitorLookup } from './monitor.js';

// File system, path, file info, conversions, watcher
export { fs, path, fileInfo, bulkEstimateTime, convertFileSize, convertDuration, watch } from './filesystem.js';

// AI / wordlist
export { aiSuggest, aiSuggestWithSettings, aiDownloadModel, aiPredict, wordlistTransform } from './ai.js';

// App / window / i18n / countLines
export { app, i18nLoad, countLines } from './app.js';

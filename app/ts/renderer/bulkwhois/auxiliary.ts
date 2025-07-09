import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('bulkwhois.auxiliary');
debug('loaded');

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

function qsa<T extends Element = HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll(sel)) as T[];
}

/*
  tableReset
    Reset bulk whois processing table contents
  parameters
    dLength (integer) -
    tLength (integer) -
 */
function tableReset(dLength = 0, tLength = 0) {
  const processed = qs('#bwProcessingSpanProcessed');
  const waiting = qs('#bwProcessingSpanWaiting');
  const total = qs('#bwProcessingSpanTotal');
  const available = qs('#bwProcessingSpanStatusavailable');
  const unavailable = qs('#bwProcessingSpanStatusunavailable');
  const error = qs('#bwProcessingSpanStatuserror');
  if (processed) processed.textContent = '0';
  if (waiting) waiting.textContent = '0';
  if (total) total.textContent = String(dLength * tLength);
  if (available) available.textContent = '0';
  if (unavailable) unavailable.textContent = '0';
  if (error) error.textContent = '0';
}

/*
  getExportOptions
    Get export options after bulk whois processing is finished
 */
function getExportOptions() {
  return {
    filetype: (qs('#bwExportSelectFiletype') as HTMLSelectElement | null)?.value,
    domains: (qs('#bwExportSelectDomains') as HTMLSelectElement | null)?.value,
    errors: (qs('#bwExportSelectErrors') as HTMLSelectElement | null)?.value,
    information: (qs('#bwExportSelectInformation') as HTMLSelectElement | null)?.value,
    whoisreply: (qs('#bwExportSelectReply') as HTMLSelectElement | null)?.value
  };
}

/*
  setExportOptions
    Sets export options to a default preset
  parameters
    preset (string) - Use a determined string formatted preset for export
 */
function setExportOptions(preset: string): void {
  switch (preset) {
    case 'none':
      unlockFields();
      break;
    // Export available only
    case 'availableonly':
      unlockFields();
      //$('#bweSelectFiletype').val('csv'); // force CSV for bulk export presets
      (qs('#bwExportSelectDomains') as HTMLSelectElement | null)!.value = 'available';
      (qs('#bwExportSelectErrors') as HTMLSelectElement | null)!.value = 'no';
      (qs('#bwExportSelectInformation') as HTMLSelectElement | null)!.value = 'domain';
      (qs('#bwExportSelectReply') as HTMLSelectElement | null)!.value = 'no';
      break;
    // All results but no reply nor debug
    case 'allbutnoreply':
      unlockFields();
      //$('#bweSelectFiletype').val('csv'); // enforce CSV output
      (qs('#bwExportSelectDomains') as HTMLSelectElement | null)!.value = 'both';
      (qs('#bwExportSelectErrors') as HTMLSelectElement | null)!.value = 'yes';
      (qs('#bwExportSelectInformation') as HTMLSelectElement | null)!.value = 'domain+basic';
      (qs('#bwExportSelectReply') as HTMLSelectElement | null)!.value = 'no';
      break;
    // Bulk whois analyser import optimized
    case 'import':
      lockFields();
      (qs('#bwExportSelectFiletype') as HTMLSelectElement | null)!.value = 'csv';
      (qs('#bwExportSelectDomains') as HTMLSelectElement | null)!.value = 'both';
      (qs('#bwExportSelectErrors') as HTMLSelectElement | null)!.value = 'yes';
      (qs('#bwExportSelectInformation') as HTMLSelectElement | null)!.value = 'domain+basic+debug';
      (qs('#bwExportSelectReply') as HTMLSelectElement | null)!.value = 'yes+block';
      break;
  }

  return;
}

/*
  setExportOptionsEx
    Set bulk whois filetype export option
  parameters
    filetype (string) - Filetype, set field locks if is txt file
 */
function setExportOptionsEx(filetype: string): void {
  switch (filetype) {
    case 'txt':
      lockFields(true);
      break;
    case 'csv':
      unlockFields(true);
      break;
  }
}

/*
  lockFields
    Locks export fields depending on filetype
  parameters
    isTxt (boolean) - Is text (.txt) filetype
 */
function lockFields(isTxt = false) {
  if (isTxt === false) {
    (qs('#bwExportSelectFiletype') as HTMLSelectElement | null)!.disabled = true;
    (qs('#bwExportSelectDomains') as HTMLSelectElement | null)!.disabled = true;
    (qs('#bwExportSelectErrors') as HTMLSelectElement | null)!.disabled = true;
  }
  const replyEl = qs('#bwExportSelectReply') as HTMLSelectElement | null;
  if (replyEl && !replyEl.disabled) {
    (qs('#bwExportSelectInformation') as HTMLSelectElement | null)!.disabled = true;
    replyEl.disabled = true;
  }
}

/*
  unlockFields
    Unlocks export fields depending on filetype
  parameters
    isTxt (boolean) - Is text (.txt) filetype
 */
function unlockFields(isTxt = false) {
  if (isTxt === true) {
    (qs('#bwExportSelectFiletype') as HTMLSelectElement | null)!.disabled = false;
  }
  const replyEl = qs('#bwExportSelectReply') as HTMLSelectElement | null;
  const filetypeEl = qs('#bwExportSelectFiletype') as HTMLSelectElement | null;
  if (replyEl && replyEl.disabled && filetypeEl?.value === 'csv') {
    filetypeEl.disabled = false;
    (qs('#bwExportSelectDomains') as HTMLSelectElement | null)!.disabled = false;
    (qs('#bwExportSelectErrors') as HTMLSelectElement | null)!.disabled = false;
    (qs('#bwExportSelectInformation') as HTMLSelectElement | null)!.disabled = false;
    replyEl.disabled = false;
  }
}

export {
  tableReset,
  tableReset as tblReset,
  getExportOptions,
  getExportOptions as getExprtOptns,
  setExportOptions,
  setExportOptions as setExprtOptns,
  setExportOptionsEx
};

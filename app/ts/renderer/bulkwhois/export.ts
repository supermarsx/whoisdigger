import defaultExportOptions from './export.defaults.js';
import { debugFactory } from '../../common/logger.js';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';
import type { BulkWhoisResults } from '../../common/bulkwhois/types.js';
import type { ExportOptions } from '../../common/bulkwhois/export-helpers.js';

const electron = (window as any).electron as RendererElectronAPI;

const debug = debugFactory('bulkwhois.export');
debug('loaded');

function qs<T extends Element = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

import { getExportOptions, setExportOptions, setExportOptionsEx } from './auxiliary.js';

import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

let results: BulkWhoisResults | null = null;
let options: ExportOptions = defaultExportOptions;

/*
  electron.on('bulkwhois:result.receive', function(...) {...});
    ipsum
  parameters
    event
    rcvResults
 */
electron.on(
  IpcChannel.BulkwhoisResultReceive,
  function (_event: unknown, rcvResults: BulkWhoisResults) {
    debug(formatString('Results are ready for export {0}', rcvResults));

    results = rcvResults;

    return;
  }
);

/*
  electron.on('bulkwhois:export.cancel', function() {...});
    Bulk whois export cancel
 */
electron.on(IpcChannel.BulkwhoisExportCancel, function () {
  qs('#bwExportloading')?.classList.add('is-hidden');
  qs('#bwEntry')?.classList.remove('is-hidden');
});

/*
  $('#bwExportButtonExport').click(function() {...});
    Bulk whois export confirm
 */
qs('#bwExportButtonExport')?.addEventListener('click', async () => {
  qs('#bwExport')?.classList.add('is-hidden');
  options = getExportOptions();
  const loading = qs('#bwExportloading');
  if (loading) {
    loading.classList.remove('is-hidden');
    await new Promise((r) => setTimeout(r, 10));
  }
  try {
    await electron.invoke(IpcChannel.BulkwhoisExport, results!, options);
  } catch (err) {
    const errText = qs('#bwExportErrorText');
    if (errText) errText.textContent = (err as Error).message;
    qs('#bwExportMessageError')?.classList.remove('is-hidden');
  }
});

/*
  $('#bwExportButtonCancel').click(function() {...});
    Export options, cancel export
 */
qs('#bwExportButtonCancel')?.addEventListener('click', () => {
  qs('#bwExport')?.classList.add('is-hidden');
  qs('#bwEntry')?.classList.remove('is-hidden');
});

/*
  $('#bwExportSelectPreset').change(function() {...});
    ipsum
 */
qs('#bwExportSelectPreset')?.addEventListener('change', () => {
  const select = qs('#bwExportSelectPreset') as HTMLSelectElement | null;
  const preset = select?.value ?? '';
  setExportOptions(preset);
});

/*
  $('#bwExportSelectFiletype').change(function() {...});
    ipsum
 */
qs('#bwExportSelectFiletype')?.addEventListener('change', () => {
  const select = qs('#bwExportSelectFiletype') as HTMLSelectElement | null;
  const filetype = select?.value ?? '';
  setExportOptionsEx(filetype);
});

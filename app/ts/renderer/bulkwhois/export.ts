import * as conversions from '../../common/conversions.js';
import defaultExportOptions from './export.defaults.js';
import $ from '../../../vendor/jquery.js';
import { debugFactory } from '../../common/logger.js';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};

const debug = debugFactory('renderer.bw.export');
debug('loaded');
import { resetObject } from '../../common/resetObject.js';
import { getExportOptions, setExportOptions, setExportOptionsEx } from './auxiliary.js';

import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

let results: any;
let options: any;

/*
  electron.on('bulkwhois:result.receive', function(...) {...});
    ipsum
  parameters
    event
    rcvResults
 */
electron.on(IpcChannel.BulkwhoisResultReceive, function (_event, rcvResults) {
  electron.send('app:debug', formatString('Results are ready for export {0}', rcvResults));

  results = rcvResults;

  return;
});

/*
  electron.on('bulkwhois:export.cancel', function() {...});
    Bulk whois export cancel
 */
electron.on(IpcChannel.BulkwhoisExportCancel, function () {
  $('#bwExportloading').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwExportButtonExport').click(function() {...});
    Bulk whois export confirm
 */
$(document).on('click', '#bwExportButtonExport', async function () {
  $('#bwExport').addClass('is-hidden');
  options = getExportOptions();
  $.when($('#bwExportloading').removeClass('is-hidden').delay(10)).done(async function () {
    try {
      await electron.invoke(IpcChannel.BulkwhoisExport, results, options);
    } catch (err) {
      $('#bwExportErrorText').text((err as Error).message);
      $('#bwExportMessageError').removeClass('is-hidden');
    }
  });

  return;
});

/*
  $('#bwExportButtonCancel').click(function() {...});
    Export options, cancel export
 */
$(document).on('click', '#bwExportButtonCancel', function () {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwExportSelectPreset').change(function() {...});
    ipsum
 */
$(document).on('change', '#bwExportSelectPreset', function () {
  const preset = $('#bwExportSelectPreset').val() as string;
  setExportOptions(preset);

  return;
});

/*
  $('#bwExportSelectFiletype').change(function() {...});
    ipsum
 */
$(document).on('change', '#bwExportSelectFiletype', function () {
  const filetype = $('#bwExportSelectFiletype').val() as string;
  setExportOptionsEx(filetype);

  return;
});

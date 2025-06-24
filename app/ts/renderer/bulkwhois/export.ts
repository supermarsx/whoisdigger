
import * as conversions from '../../common/conversions';
import defaultExportOptions from './export.defaults';
import $ from 'jquery';

import { ipcRenderer } from 'electron';
import { resetObject } from '../../common/resetObject';
import {
  getExportOptions,
  setExportOptions,
  setExportOptionsEx,
} from './auxiliary';

import { formatString } from '../../common/stringformat';

let results: any;
let options: any;

/*
  ipcRenderer.on('bulkwhois:result.receive', function(...) {...});
    ipsum
  parameters
    event
    rcvResults
 */
ipcRenderer.on('bulkwhois:result.receive', function(event, rcvResults) {
  ipcRenderer.send('app:debug', formatString('Results are ready for export {0}', rcvResults));

  results = rcvResults;

  return;
});

/*
  ipcRenderer.on('bulkwhois:export.cancel', function() {...});
    Bulk whois export cancel
 */
ipcRenderer.on('bulkwhois:export.cancel', function() {
  $('#bwExportloading').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});


/*
  $('#bwExportButtonExport').click(function() {...});
    Bulk whois export confirm
 */
$(document).on('click', '#bwExportButtonExport', async function() {
  $('#bwExport').addClass('is-hidden');
  options = getExportOptions();
  $.when($('#bwExportloading').removeClass('is-hidden').delay(10)).done(async function() {
    try {
      await ipcRenderer.invoke('bulkwhois:export', results, options);
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
$(document).on('click', '#bwExportButtonCancel', function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwExportSelectPreset').change(function() {...});
    ipsum
 */
$(document).on('change', '#bwExportSelectPreset', function() {
  const preset = $('#bwExportSelectPreset').val() as string;
  setExportOptions(preset);

  return;
});

/*
  $('#bwExportSelectFiletype').change(function() {...});
    ipsum
 */
$(document).on('change', '#bwExportSelectFiletype', function() {
  const filetype = $('#bwExportSelectFiletype').val() as string;
  setExportOptionsEx(filetype);

  return;
});

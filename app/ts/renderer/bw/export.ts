
import * as conversions from '../../common/conversions';
import defaultExportOptions from './export.defaults';

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
  ipcRenderer.on('bw:result.receive', function(...) {...});
    ipsum
  parameters
    event
    rcvResults
 */
ipcRenderer.on('bw:result.receive', function(event, rcvResults) {
  ipcRenderer.send('app:debug', formatString('Results are ready for export {0}', rcvResults));

  results = rcvResults;
  //console.log("%o", results);

  return;
});

/*
  ipcRenderer.on('bw:export.cancel', function() {...});
    Bulk whois export cancel
 */
ipcRenderer.on('bw:export.cancel', function() {
  $('#bwExportloading').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  ipcRenderer.on('bw:export.error', function(...) {...});
    Bulk whois export error
 */
ipcRenderer.on('bw:export.error', function(event, message) {
  $('#bwExportErrorText').text(message);
  $('#bwExportMessageError').removeClass('is-hidden');

  return;
});

/*
  $('#bwExportButtonExport').click(function() {...});
    Bulk whois export confirm
 */
$(document).on('click', '#bwExportButtonExport', function() {
  $('#bwExport').addClass('is-hidden');
  options = getExportOptions();
  $.when($('#bwExportloading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bw:export", results, options);
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


const whois = require('../../common/whoiswrapper'),
  conversions = require('../../common/conversions'),
  defaultExportOptions = require('./export.defaults');

const {
  ipcRenderer
} = require('electron'), {
  resetObject
} = require('../../common/resetObject'), {
  getExportOptions,
  setExportOptions,
  setExportOptionsEx
} = require('./auxiliary');

const { formatString } = require('../../common/stringformat');

var results, options;

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
  var preset = $('#bwExportSelectPreset').val();
  setExportOptions(preset);

  return;
});

/*
  $('#bwExportSelectFiletype').change(function() {...});
    ipsum
 */
$(document).on('change', '#bwExportSelectFiletype', function() {
  var filetype = $('#bwExportSelectFiletype').val();
  setExportOptionsEx(filetype);

  return;
});

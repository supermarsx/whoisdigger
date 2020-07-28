// jshint esversion: 8

const whois = require('../../common/whoisWrapper'),
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

require('../../common/stringFormat');

var results, options;

/*
  ipcRenderer.on('bw:result.receive', function(...) {...});
    ipsum
  parameters
    event
    rcvResults
 */
ipcRenderer.on('bw:result.receive', function(event, rcvResults) {
  ipcRenderer.send('app:debug', "Results are ready for export {0}".format(rcvResults));

  results = rcvResults;
  //console.log("%o", results);
});

/*
  ipcRenderer.on('bw:export.cancel', function() {...});
    Bulk whois export cancel
 */
ipcRenderer.on('bw:export.cancel', function() {
  $('#bwExportloading').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

/*
  $('#bwExportButtonExport').click(function() {...});
    Bulk whois export confirm
 */
$('#bwExportButtonExport').click(function() {
  $('#bwExport').addClass('is-hidden');
  options = getExportOptions();
  $.when($('#bwExportloading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bw:export", results, options);
  });
});

/*
  $('#bwExportButtonCancel').click(function() {...});
    Export options, cancel export
 */
$('#bwExportButtonCancel').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

/*
  $('#bwExportSelectPreset').change(function() {...});
    ipsum
 */
$('#bwExportSelectPreset').change(function() {
  var preset = $('#bwExportSelectPreset').val();
  setExportOptions(preset);
});

/*
  $('#bwExportSelectFiletype').change(function() {...});
    ipsum
 */
$('#bwExportSelectFiletype').change(function() {
  var filetype = $('#bwExportSelectFiletype').val();
  setExportOptionsEx(filetype);
});

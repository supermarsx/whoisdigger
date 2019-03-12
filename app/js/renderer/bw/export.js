var whois = require('../../common/whoiswrapper.js'),
  conversions = require('../../common/conversions.js'),
  defaultExportOptions = require('./export.defaults.js'),
  results, options;

require('../../common/stringformat.js');

const {
  ipcRenderer
} = require('electron');

var {
  resetObject
} = require('../../common/resetobj.js');

var {
  getExportOptions,
  setExportOptions,
  setExportOptionsEx
} = require('./auxiliary.js');

ipcRenderer.on('bw:result.receive', function(event, rcvResults) {
  ipcRenderer.send('app:debug', "Results are ready for export {0}".format(rcvResults));

  results = rcvResults;
  //console.log("%o", results);
});

ipcRenderer.on('bw:export.cancel', function() {
  $('#bwExportloading').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Export options, confirm export
$('#bwExportButtonExport').click(function() {
  $('#bwExport').addClass('is-hidden');
  options = getExportOptions();
  $.when($('#bwExportloading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bw:export", results, options);
  });
});

// Export options, cancel export
$('#bwExportButtonCancel').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

$('#bwExportSelectPreset').change(function() {
  var preset = $('#bwExportSelectPreset').val();
  setExportOptions(preset);
});

$('#bwExportSelectFiletype').change(function() {
  var filetype = $('#bwExportSelectFiletype').val();
  setExportOptionsEx(filetype);
});

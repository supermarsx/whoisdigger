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

ipcRenderer.on('bulkwhois:result.receive', function(event, rcvResults) {
  ipcRenderer.send('app:debug', "Results are ready for export {0}".format(rcvResults));

  results = rcvResults;
  //console.log("%o", results);
});

ipcRenderer.on('bulkwhois:export.cancel', function() {
  $('#bwExportLoading').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Export options, confirm export
$('#bweButtonExport').click(function() {
  $('#bwExport').addClass('is-hidden');
  options = getExportOptions();
  $.when($('#bwExportLoading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bulkwhois:export", results, options);
  });
});

// Export options, cancel export
$('#bweButtonCancel').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

$('#bweSelectPreset').change(function() {
  var preset = $('#bweSelectPreset').val();
  setExportOptions(preset);
});

$('#bweSelectFiletype').change(function() {
  var filetype = $('#bweSelectFiletype').val();
  setExportOptionsEx(filetype);
});

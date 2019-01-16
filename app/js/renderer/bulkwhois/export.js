var whois = require('../../common/whoiswrapper.js');
var conversions = require('../../common/conversions.js');

require('../../common/stringformat.js');

const {
  ipcRenderer
} = require('electron');

// Export options, confirm export
$('#bweButtonExport').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#')
});

// Export options, cancel export
$('#bweButtonCancel').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

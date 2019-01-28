var whois = require('../../common/whoiswrapper.js');
var conversions = require('../../common/conversions.js');

require('../../common/stringformat.js');

const {
  ipcRenderer
} = require('electron');

var defaultExportOptions = require('./export.defaults.js');

var {
  resetObject
} = require('../../common/resetobj.js');

// Export options, confirm export
$('#bweButtonExport').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwExportLoading').removeClass('is-hidden');
  options = getExportOptions();
  ipcRenderer.send("bulkwhois:export", options);
});

// Export options, cancel export
$('#bweButtonCancel').click(function() {
  $('#bwExport').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Get export options from the form
function getExportOptions() {
  var options = resetObject();
  options = {
    'filetype': $('#bweSelectFiletype').attr('value'),
    'domains': $('#bweSelectDomains').attr('value'),
    'errors': $('#bweSelectErrors').attr('value'),
    'information': $('#bweSelectInformation').attr('value'),
    'whoisreply': $('#bweSelectWhoisreply').attr('value')
  }
  return options;
}

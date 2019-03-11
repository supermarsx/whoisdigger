var {
  resetObject
} = require('../../common/resetobj.js');

// Reset table
function tableReset(dLength = 0, tLength = 0) {
  $('#bwTableProcessingProcessed').text(0);
  $('#bwTableProcessingWaiting').text(0);
  $('#bwTableProcessingTotal').text(dLength * tLength);

  $('#bwTableProcessingDomAvail').text(0);
  $('#bwTableProcessingDomUnavail').text(0);
  $('#bwTableProcessingDomError').text(0);
}

// Get export options from the form
function getExportOptions() {
  var options = {};
  options = {
    'filetype': $('#bweSelectFiletype').val(),
    'domains': $('#bweSelectDomains').val(),
    'errors': $('#bweSelectErrors').val(),
    'information': $('#bweSelectInformation').val(),
    'whoisreply': $('#bweSelectWhoisreply').val()
  }
  return options;
}

function setExportOptions(preset) {
  switch (preset) {
    case ('none'):
      unlockFields();
      break;
    case ('availableonly'):
      unlockFields();
      //$('#bweSelectFiletype').val('csv');
      $('#bweSelectDomains').val('available');
      $('#bweSelectErrors').val('no');
      $('#bweSelectInformation').val('domain');
      $('#bweSelectWhoisreply').val('no');
      break;
    case ('allbutnoreply'):
      unlockFields();
      //$('#bweSelectFiletype').val('csv');
      $('#bweSelectDomains').val('both');
      $('#bweSelectErrors').val('yes');
      $('#bweSelectInformation').val('domain+basic');
      $('#bweSelectWhoisreply').val('no');
      break;
    case ('import'):
      lockFields();
      $('#bweSelectFiletype').val('csv');
      $('#bweSelectDomains').val('both');
      $('#bweSelectErrors').val('yes');
      $('#bweSelectInformation').val('domain+basic+debug');
      $('#bweSelectWhoisreply').val('yes+block');
      break;
  }

}

function setExportOptionsEx(filetype) {
  switch (filetype) {
    case 'txt':
      lockFields(true);
      break;
    case 'csv':
      unlockFields(true);
      break;
  }
}

function lockFields(isTxt = false) {
  if (isTxt === false) {
    $('#bweSelectFiletype').prop("disabled", true);
    $('#bweSelectDomains').prop("disabled", true);
    $('#bweSelectErrors').prop("disabled", true);
  }
  if ($('#bweSelectWhoisreply').prop("disabled") === false) {
    $('#bweSelectInformation').prop("disabled", true);
    $('#bweSelectWhoisreply').prop("disabled", true);
  }
}

function unlockFields(isTxt = false) {
  if (isTxt === true) {
    $('#bweSelectFiletype').prop("disabled", false);
  }
  if ($('#bweSelectWhoisreply').prop("disabled") === true && $('#bweSelectFiletype').val() == 'csv') {
    $('#bweSelectFiletype').prop("disabled", false);
    $('#bweSelectDomains').prop("disabled", false);
    $('#bweSelectErrors').prop("disabled", false);
    $('#bweSelectInformation').prop("disabled", false);
    $('#bweSelectWhoisreply').prop("disabled", false);
  }
}

module.exports = {
  tableReset: tableReset,
  tblReset: tableReset,
  getExportOptions: getExportOptions,
  getExprtOptns: getExportOptions,
  setExportOptions: setExportOptions,
  setExprtOptns: setExportOptions,
  setExportOptionsEx: setExportOptionsEx
}

var {
  resetObject
} = require('../../common/resetobj.js');

// Reset processing table
function tableReset(dLength = 0, tLength = 0) {
  $('#bwProcessingSpanProcessed').text(0);
  $('#bwProcessingSpanWaiting').text(0);
  $('#bwProcessingSpanTotal').text(dLength * tLength);

  $('#bwProcessingSpanStatusavailable').text(0);
  $('#bwProcessingSpanStatusunavailable').text(0);
  $('#bwProcessingSpanStatuserror').text(0);
}

// Get export options from the form
function getExportOptions() {
  return {
    'filetype': $('#bwExportSelectFiletype').val(),
    'domains': $('#bwExportSelectDomains').val(),
    'errors': $('#bwExportSelectErrors').val(),
    'information': $('#bwExportSelectInformation').val(),
    'whoisreply': $('#bwExportSelectReply').val()
  }
}

// Set bulk whois export option fields to a preset
function setExportOptions(preset) {
  switch (preset) {
    case ('none'):
      unlockFields();
      break;
    case ('availableonly'):
      unlockFields();
      //$('#bweSelectFiletype').val('csv');
      $('#bwExportSelectDomains').val('available');
      $('#bwExportSelectErrors').val('no');
      $('#bwExportSelectInformation').val('domain');
      $('#bwExportSelectReply').val('no');
      break;
    case ('allbutnoreply'):
      unlockFields();
      //$('#bweSelectFiletype').val('csv');
      $('#bwExportSelectDomains').val('both');
      $('#bwExportSelectErrors').val('yes');
      $('#bwExportSelectInformation').val('domain+basic');
      $('#bwExportSelectReply').val('no');
      break;
    case ('import'):
      lockFields();
      $('#bwExportSelectFiletype').val('csv');
      $('#bwExportSelectDomains').val('both');
      $('#bwExportSelectErrors').val('yes');
      $('#bwExportSelectInformation').val('domain+basic+debug');
      $('#bwExportSelectReply').val('yes+block');
      break;
  }

}

// Set bulk whois export option, filetype
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

// Lock bulk whois export fields
function lockFields(isTxt = false) {
  if (isTxt === false) {
    $('#bwExportSelectFiletype').prop("disabled", true);
    $('#bwExportSelectDomains').prop("disabled", true);
    $('#bwExportSelectErrors').prop("disabled", true);
  }
  if ($('#bwExportSelectReply').prop("disabled") === false) {
    $('#bwExportSelectInformation').prop("disabled", true);
    $('#bwExportSelectReply').prop("disabled", true);
  }
}

// Unlock bulk whois export fields
function unlockFields(isTxt = false) {
  if (isTxt === true) {
    $('#bwExportSelectFiletype').prop("disabled", false);
  }
  if ($('#bwExportSelectReply').prop("disabled") === true && $('#bwExportSelectFiletype').val() == 'csv') {
    $('#bwExportSelectFiletype').prop("disabled", false);
    $('#bwExportSelectDomains').prop("disabled", false);
    $('#bwExportSelectErrors').prop("disabled", false);
    $('#bwExportSelectInformation').prop("disabled", false);
    $('#bwExportSelectReply').prop("disabled", false);
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

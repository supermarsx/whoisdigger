/*
  jshint esversion: 8
 */

var {
  resetObject
} = require('../../common/resetObject');

/*
  tableReset
    Reset bulk whois processing table contents
  parameters
    dLength (integer) -
    tLength (integer) -
 */
function tableReset(dLength = 0, tLength = 0) {
  $('#bwProcessingSpanProcessed').text(0);
  $('#bwProcessingSpanWaiting').text(0);
  $('#bwProcessingSpanTotal').text(dLength * tLength);

  $('#bwProcessingSpanStatusavailable').text(0);
  $('#bwProcessingSpanStatusunavailable').text(0);
  $('#bwProcessingSpanStatuserror').text(0);
}

/*
  getExportOptions
    Get export options after bulk whois processing is finished
 */
function getExportOptions() {
  return {
    'filetype': $('#bwExportSelectFiletype').val(),
    'domains': $('#bwExportSelectDomains').val(),
    'errors': $('#bwExportSelectErrors').val(),
    'information': $('#bwExportSelectInformation').val(),
    'whoisreply': $('#bwExportSelectReply').val()
  };
}

/*
  setExportOptions
    Sets export options to a default preset
  parameters
    preset (string) - Use a determined string formatted preset for export
 */
function setExportOptions(preset) {
  switch (preset) {
    case ('none'):
      unlockFields();
      break;
    // Export available only
    case ('availableonly'):
      unlockFields();
      //$('#bweSelectFiletype').val('csv');
      $('#bwExportSelectDomains').val('available');
      $('#bwExportSelectErrors').val('no');
      $('#bwExportSelectInformation').val('domain');
      $('#bwExportSelectReply').val('no');
      break;
    // All results but no reply nor debug
    case ('allbutnoreply'):
      unlockFields();
      //$('#bweSelectFiletype').val('csv');
      $('#bwExportSelectDomains').val('both');
      $('#bwExportSelectErrors').val('yes');
      $('#bwExportSelectInformation').val('domain+basic');
      $('#bwExportSelectReply').val('no');
      break;
    // Bulk whois analyser import optimized
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

/*
  setExportOptionsEx
    Set bulk whois filetype export option
  parameters
    filetype (string) - Filetype, set field locks if is txt file
 */
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

/*
  lockFields
    Locks export fields depending on filetype
  parameters
    isTxt (boolean) - Is text (.txt) filetype
 */
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

/*
  unlockFields
    Unlocks export fields depending on filetype
  parameters
    isTxt (boolean) - Is text (.txt) filetype
 */
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
};

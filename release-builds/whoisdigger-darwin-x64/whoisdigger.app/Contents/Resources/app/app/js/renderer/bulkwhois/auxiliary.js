// Reset table
function tableReset(dLength = 0, tLength = 0) {
  $('#bwTableProcessingProcessed').text(0);
  $('#bwTableProcessingWaiting').text(0);
  $('#bwTableProcessingTotal').text(dLength * tLength);

  $('#bwTableProcessingDomAvail').text(0);
  $('#bwTableProcessingDomUnavail').text(0);
  $('#bwTableProcessingDomError').text(0);
}

module.exports = {
  tableReset: tableReset
}

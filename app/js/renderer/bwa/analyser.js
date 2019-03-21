/** global: appSettings */
var whois = require('../../common/whoiswrapper.js'),
  conversions = require('../../common/conversions.js'),
  fs = require('fs'),
  Papa = require('papaparse'),
  dt = require('datatables')(),
  bwaFileContents;

const {
  ipcRenderer
} = require('electron');

ipcRenderer.on('bwa:analyser.tablegen', function(event, contents) {
  bwaFileContents = contents;
  showTable();
});

$('#bwaAnalyserButtonClose').click(function() {
  $('#bwaAnalyserModalClose').addClass('is-active');
});

$('#bwaAnalyserModalCloseButtonYes').click(function() {
  $('#bwaAnalyser').addClass('is-hidden');
  $('#bwaAnalyserModalClose').removeClass('is-active');
  $('#bwaEntry').removeClass('is-hidden');
});

$('#bwaAnalyserModalCloseButtonNo').click(function() {
  $('#bwaAnalyserModalClose').removeClass('is-active');
});

function showTable() {
  var header = {},
    body = {};
  header.columns = Object.keys(bwaFileContents.data[0]);
  //console.log(header.columns);
  body.records = bwaFileContents.data;

  // Generate header column content
  header.content = '<tr>\n';
  for (var column in header.columns) {
    header.content += '\t<th><abbr title="{0}">{1}</abbr></th>\n'.format(header.columns[column], getInitials(header.columns[column]));
  }
  header.content += '</tr>';

  $('#bwaAnalyserTableThead').html(header.content);
  //console.log(header.content);

  // Generate record fields
  body.content = '';
  for (var record in body.records) {
    body.content += '<tr>\n';
    //console.log(body.content);
    //console.log(body.records[record]);

    for (var field in body.records[record]) {
      body.content += '\t<td>{0}</td>\n'.format(body.records[record][field]);
    }
    body.content += '</tr>\n';
  }
  //console.log(body.content);
  $('#bwaAnalyserTableTbody').html(body.content);
  body.table = $('#bwaAnalyserTable').dataTable();
  //$('#bwaAnalyserTable_paginate > a').addClass('button is-small')

  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bwaAnalyser').removeClass('is-hidden');
}

function getInitials(string, threshold = 1) {
  var initials = string.match(/\b\w/g);

  (initials.length > threshold) ?
    initials = initials.join("").toString() :
    initials = string.substring(0, threshold + 1);

  return initials;
}

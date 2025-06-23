
/** global: appSettings */
const whois = require('../../common/whoiswrapper'),
  conversions = require('../../common/conversions'),
  fs = require('fs'),
  Papa = require('papaparse'),
  dt = require('datatables')();

const {
  ipcRenderer
} = require('electron');

var bwaFileContents;

/*
  ipcRenderer.on('bwa:analyser.tablegen', function() {...});
    Generate analyser content table
  parameters
    event
    contents
 */
ipcRenderer.on('bwa:analyser.tablegen', function(event, contents) {
  bwaFileContents = contents;
  showTable();

  return;
});

/*
  $('#bwaAnalyserButtonClose').click(function() {...});
    Bulk whois analyser close button
 */
$('#bwaAnalyserButtonClose').click(function() {
  ipcRenderer.send('app:debug', '#bwaAnalyserButtonClose clicked');
  $('#bwaAnalyserModalClose').addClass('is-active');

  return;
});

/*
  $('#bwaAnalyserModalCloseButtonYes').click(function() {...});
    bwa, close dialog confirm/yes
 */
$('#bwaAnalyserModalCloseButtonYes').click(function() {
  $('#bwaAnalyser').addClass('is-hidden');
  $('#bwaAnalyserModalClose').removeClass('is-active');
  $('#bwaEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwaAnalyserModalCloseButtonNo').click(function() {...});
    Bulk whois analyser close dialog cancel/no button
 */
$('#bwaAnalyserModalCloseButtonNo').click(function() {
  $('#bwaAnalyserModalClose').removeClass('is-active');

  return;
});

/*
  showTable
    ipsum
 */
function showTable() {
  const header: Record<string, any> = {},
    body: Record<string, any> = {};
  header.columns = Object.keys(bwaFileContents.data[0]);
  body.records = bwaFileContents.data;

  // Generate header column content
  header.content = '<tr>\n';
  for (var column in header.columns) {
    header.content += '\t<th><abbr title="{0}">{1}</abbr></th>\n'.format(header.columns[column], getInitials(header.columns[column]));
  }
  header.content += '</tr>';

  $('#bwaAnalyserTableThead').html(header.content);

  // Generate record fields
  body.content = '';
  for (var record in body.records) {
    body.content += '<tr>\n';

    for (var field in body.records[record]) {
      body.content += '\t<td>{0}</td>\n'.format(body.records[record][field]);
    }
    body.content += '</tr>\n';
  }
  $('#bwaAnalyserTableTbody').html(body.content);

  body.table = ($('#bwaAnalyserTable') as any).dataTable({
    'destroy': true
  });


  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bwaAnalyser').removeClass('is-hidden');
  //body.content.destroy();

  return;
}

/*
  getInitials
    ipsum
  parameters
    string
    threshold
 */
function getInitials(string, threshold = 1) {
  var initials = string.match(/\b\w/g);

  initials = (initials.length > threshold) ?
    initials.join("").toString() :
    string.substring(0, threshold + 1);

  return initials;
}


import * as conversions from '../../common/conversions';
import fs from 'fs';
import Papa from 'papaparse';
import datatables from 'datatables';
const dt = datatables();
import $ from 'jquery';

import { ipcRenderer } from 'electron';

import { formatString } from '../../common/stringformat';

let bwaFileContents: any;

/*
  ipcRenderer.on('bulkwhoisanalyser:analyser.tablegen', function() {...});
    Generate analyser content table
  parameters
    event
    contents
 */
ipcRenderer.on('bulkwhoisanalyser:analyser.tablegen', function(event, contents) {
  bwaFileContents = contents;
  showTable();

  return;
});

/*
  $('#bulkwhoisanalyserAnalyserButtonClose').click(function() {...});
    Bulk whois analyser close button
 */
$('#bulkwhoisanalyserAnalyserButtonClose').click(function() {
  ipcRenderer.send('app:debug', '#bulkwhoisanalyserAnalyserButtonClose clicked');
  $('#bulkwhoisanalyserAnalyserModalClose').addClass('is-active');

  return;
});

/*
  $('#bulkwhoisanalyserAnalyserModalCloseButtonYes').click(function() {...});
    bulkwhoisanalyser close dialog confirm/yes
 */
$('#bulkwhoisanalyserAnalyserModalCloseButtonYes').click(function() {
  $('#bulkwhoisanalyser').addClass('is-hidden');
  $('#bulkwhoisanalyserAnalyserModalClose').removeClass('is-active');
  $('#bwaEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bulkwhoisanalyserAnalyserModalCloseButtonNo').click(function() {...});
    Bulk whois analyser close dialog cancel/no button
 */
$('#bulkwhoisanalyserAnalyserModalCloseButtonNo').click(function() {
  $('#bulkwhoisanalyserAnalyserModalClose').removeClass('is-active');

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
  for (const column of header.columns) {
    header.content += formatString('\t<th><abbr title="{0}">{1}</abbr></th>\n', column, getInitials(column));
  }
  header.content += '</tr>';

  $('#bulkwhoisanalyserAnalyserTableThead').html(header.content);

  // Generate record fields
  body.content = '';
  for (const record of body.records) {
    body.content += '<tr>\n';

    for (const value of Object.values(record)) {
      body.content += formatString('\t<td>{0}</td>\n', value);
    }
    body.content += '</tr>\n';
  }
  $('#bulkwhoisanalyserAnalyserTableTbody').html(body.content);

  body.table = ($('#bulkwhoisanalyserAnalyserTable') as any).dataTable({
    'destroy': true
  });


  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bulkwhoisanalyser').removeClass('is-hidden');
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
function getInitials(str: string, threshold = 1): string {
  let initials = str.match(/\b\w/g) || [];

  const result =
    initials.length > threshold
      ? initials.join('').toString()
      : str.substring(0, threshold + 1);

  return result;
}

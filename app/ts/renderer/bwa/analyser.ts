import * as conversions from '../../common/conversions';
import fs from 'fs';
import Papa from 'papaparse';
import datatables from 'datatables';
const dt = datatables();
import $ from 'jquery';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};

import { formatString } from '../../common/stringformat';

let bwaFileContents: any;

/*
  electron.on('bwa:analyser.tablegen', function() {...});
    Generate analyser content table
  parameters
    event
    contents
 */
electron.on('bwa:analyser.tablegen', function (event, contents) {
  bwaFileContents = contents;
  showTable();

  return;
});

/*
  $('#bwaAnalyserButtonClose').click(function() {...});
    Bulk whois analyser close button
 */
$('#bwaAnalyserButtonClose').click(function () {
  electron.send('app:debug', '#bwaAnalyserButtonClose clicked');
  $('#bwaAnalyserModalClose').addClass('is-active');

  return;
});

/*
  $('#bwaAnalyserModalCloseButtonYes').click(function() {...});
    bwa, close dialog confirm/yes
 */
$('#bwaAnalyserModalCloseButtonYes').click(function () {
  $('#bwaAnalyser').addClass('is-hidden');
  $('#bwaAnalyserModalClose').removeClass('is-active');
  $('#bwaEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwaAnalyserModalCloseButtonNo').click(function() {...});
    Bulk whois analyser close dialog cancel/no button
 */
$('#bwaAnalyserModalCloseButtonNo').click(function () {
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
  for (const column of header.columns) {
    header.content += formatString(
      '\t<th><abbr title="{0}">{1}</abbr></th>\n',
      column,
      getInitials(column)
    );
  }
  header.content += '</tr>';

  $('#bwaAnalyserTableThead').html(header.content);

  // Generate record fields
  body.content = '';
  for (const record of body.records) {
    body.content += '<tr>\n';

    for (const value of Object.values(record)) {
      body.content += formatString('\t<td>{0}</td>\n', value);
    }
    body.content += '</tr>\n';
  }
  $('#bwaAnalyserTableTbody').html(body.content);

  body.table = ($('#bwaAnalyserTable') as any).dataTable({
    destroy: true
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
function getInitials(str: string, threshold = 1): string {
  let initials = str.match(/\b\w/g) || [];

  const result =
    initials.length > threshold ? initials.join('').toString() : str.substring(0, threshold + 1);

  return result;
}

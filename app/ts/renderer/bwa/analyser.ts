import * as conversions from '../../common/conversions.js';
import { qs, on } from '../../utils/dom.js';
import jq from '../jqueryGlobal.js';
(window as any).jQuery = jq;
(window as any).$ = jq;

let datatablesReady: Promise<unknown> | null = null;

async function ensureDataTables(): Promise<void> {
  if (!(jq as any).fn.DataTable) {
    datatablesReady ??= import('../../../vendor/datatables.js');
    await datatablesReady;
  }
}
import { debugFactory } from '../../common/logger.js';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI;

const debug = debugFactory('renderer.bwa.analyser');
debug('loaded');

import { formatString } from '../../common/stringformat.js';

let bwaFileContents: any;

/*
  electron.on('bwa:analyser.tablegen', function() {...});
    Generate analyser content table
  parameters
    event
    contents
 */
export async function renderAnalyser(contents: any): Promise<void> {
  bwaFileContents = contents;
  await showTable();
}

/*
  $('#bwaAnalyserButtonClose').click(function() {...});
    Bulk whois analyser close button
 */
on('click', '#bwaAnalyserButtonClose', () => {
  debug('#bwaAnalyserButtonClose clicked');
  qs('#bwaAnalyserModalClose')!.classList.add('is-active');
});

/*
  $('#bwaAnalyserModalCloseButtonYes').click(function() {...});
    bwa, close dialog confirm/yes
 */
on('click', '#bwaAnalyserModalCloseButtonYes', () => {
  qs('#bwaAnalyser')!.classList.add('is-hidden');
  qs('#bwaAnalyserModalClose')!.classList.remove('is-active');
  qs('#bwaEntry')!.classList.remove('is-hidden');
});

/*
  $('#bwaAnalyserModalCloseButtonNo').click(function() {...});
    Bulk whois analyser close dialog cancel/no button
 */
on('click', '#bwaAnalyserModalCloseButtonNo', () => {
  qs('#bwaAnalyserModalClose')!.classList.remove('is-active');
});

/*
  showTable
    ipsum
 */
async function showTable() {
  await ensureDataTables();
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

  qs('#bwaAnalyserTableThead')!.innerHTML = header.content;

  // Generate record fields
  body.content = '';
  for (const record of body.records) {
    body.content += '<tr>\n';

    for (const value of Object.values(record)) {
      body.content += formatString('\t<td>{0}</td>\n', value);
    }
    body.content += '</tr>\n';
  }
  qs('#bwaAnalyserTableTbody')!.innerHTML = body.content;

  // Use jQuery wrapper to initialise DataTables correctly
  body.table = (jq('#bwaAnalyserTable') as any).DataTable({
    destroy: true
  });

  qs('#bwaFileinputconfirm')!.classList.add('is-hidden');
  qs('#bwaAnalyser')!.classList.remove('is-hidden');
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

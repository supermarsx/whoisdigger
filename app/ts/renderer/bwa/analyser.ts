import { qs, on } from '../../utils/dom.js';
import { bwaRenderTableHtml } from '../../common/tauriBridge.js';
// jQuery and DataTables are loaded globally via renderer/index.ts

import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('renderer.bwa.analyser');
debug('loaded');

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
void on('click', '#bwaAnalyserButtonClose', () => {
  debug('#bwaAnalyserButtonClose clicked');
  qs('#bwaAnalyserModalClose')!.classList.add('is-active');
});

/*
  $('#bwaAnalyserModalCloseButtonYes').click(function() {...});
    bwa, close dialog confirm/yes
 */
void on('click', '#bwaAnalyserModalCloseButtonYes', () => {
  qs('#bwaAnalyser')!.classList.add('is-hidden');
  qs('#bwaAnalyserModalClose')!.classList.remove('is-active');
  qs('#bwaEntry')!.classList.remove('is-hidden');
});

/*
  $('#bwaAnalyserModalCloseButtonNo').click(function() {...});
    Bulk whois analyser close dialog cancel/no button
 */
void on('click', '#bwaAnalyserModalCloseButtonNo', () => {
  qs('#bwaAnalyserModalClose')!.classList.remove('is-active');
});

/*
  showTable
    ipsum
 */
async function showTable() {
  const records = Array.isArray(bwaFileContents?.data) ? bwaFileContents.data : [];

  const DT = (window as any).DataTable;
  if (typeof DT === 'function' && DT.isDataTable?.('#bwaAnalyserTable')) {
    DT('#bwaAnalyserTable').destroy();
  }

  const thead = qs('#bwaAnalyserTableThead')!;
  const tbody = qs('#bwaAnalyserTableTbody')!;
  thead.textContent = '';
  tbody.textContent = '';

  if (records.length > 0) {
    // Render table HTML server-side via rayon — avoids N×M createElement calls
    const html = await bwaRenderTableHtml(records);
    thead.innerHTML = html.thead;
    tbody.innerHTML = html.tbody;
  }

  qs('#bwaFileinputconfirm')!.classList.add('is-hidden');
  qs('#bwaAnalyser')!.classList.remove('is-hidden');
  if (typeof DT === 'function' && records.length > 0) {
    new DT('#bwaAnalyserTable');
  }
}

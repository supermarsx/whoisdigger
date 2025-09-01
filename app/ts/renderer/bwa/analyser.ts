import { qs, on } from '../../utils/dom.js';
// jQuery and DataTables are loaded globally via renderer/index.ts

import { debugFactory } from '../../common/logger.js';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI;

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
    const columns = Object.keys(records[0]);
    const headerRow = document.createElement('tr');
    for (const column of columns) {
      const th = document.createElement('th');
      const abbr = document.createElement('abbr');
      abbr.title = column;
      abbr.textContent = getInitials(column);
      th.appendChild(abbr);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);

    for (const record of records) {
      const row = document.createElement('tr');
      for (const value of Object.values(record)) {
        const td = document.createElement('td');
        td.textContent = String(value);
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
  }

  qs('#bwaFileinputconfirm')!.classList.add('is-hidden');
  qs('#bwaAnalyser')!.classList.remove('is-hidden');
  if (typeof DT === 'function' && records.length > 0) {
    new DT('#bwaAnalyserTable');
  }
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

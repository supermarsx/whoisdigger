import { qs, qsa, on } from '../utils/dom.js';
import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI;
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.history');
debug('loaded');

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function loadHistory(): void {
  electron.invoke('history:get').then((entries: any[]) => {
    const tbody = qs('#historyTable tbody')!;
    tbody.innerHTML = '';
    if (!entries.length) {
      qs('#historyEmpty')!.classList.remove('is-hidden');
      return;
    }
    qs('#historyEmpty')!.classList.add('is-hidden');
    for (const e of entries) {
      const row = document.createElement('tr');
      const tdDomain = document.createElement('td');
      tdDomain.textContent = e.domain;
      row.appendChild(tdDomain);
      const tdStatus = document.createElement('td');
      tdStatus.textContent = e.status;
      row.appendChild(tdStatus);
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(e.timestamp);
      row.appendChild(tdDate);
      tbody.appendChild(row);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  on('click', '#clearHistory', async () => {
    await electron.invoke('history:clear');
    loadHistory();
  });
});

export const _test = { loadHistory };

import { qs, qsa, on } from '../utils/dom.js';
import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const electron = (window as any).electron as RendererElectronAPI;
import { debugFactory } from '../common/logger.js';
import { IpcChannel } from '../common/ipcChannels.js';
import DomainStatus from '../common/status.js';

const debug = debugFactory('renderer.history');
debug('loaded');

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

let allEntries: any[] = [];
let page = 0;
const pageSize = 50;

function ensureControls(): void {
  const table = qs('#historyTable');
  if (!table) return;
  let controls = qs('#historyControls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'historyControls';
    controls.className = 'field is-grouped is-grouped-right';
    controls.innerHTML = `
      <div class="control"><input id="historySearch" class="input is-small" type="text" placeholder="Filter domains"></div>
      <div class="control"><div class="buttons are-small"><button id="historyPrev" class="button">Prev</button><button id="historyNext" class="button">Next</button></div></div>
      <div class="control"><span id="historyStatus" class="is-size-7 has-text-grey"></span></div>
    `;
    table.parentElement?.insertBefore(controls, table);
    (qs('#historyPrev') as HTMLButtonElement | null)?.addEventListener('click', () => {
      if (page > 0) {
        page--;
        renderPage();
      }
    });
    (qs('#historyNext') as HTMLButtonElement | null)?.addEventListener('click', () => {
      if ((page + 1) * pageSize < allEntries.length) {
        page++;
        renderPage();
      }
    });
    (qs('#historySearch') as HTMLInputElement | null)?.addEventListener('input', () => {
      page = 0;
      renderPage();
    });

    // Add status and timeframe filters
    const statusCtrl = document.createElement('div');
    statusCtrl.className = 'control';
    statusCtrl.innerHTML = `
      <div class="select is-small">
        <select id="historyStatusFilter">
          <option value="">All statuses</option>
          <option value="Available">Available</option>
          <option value="Unavailable">Unavailable</option>
          <option value="Error">Error</option>
        </select>
      </div>`;
    controls.appendChild(statusCtrl);
    (qs('#historyStatusFilter') as HTMLSelectElement | null)?.addEventListener('change', () => {
      page = 0;
      renderPage();
    });

    const timeCtrl = document.createElement('div');
    timeCtrl.className = 'control';
    timeCtrl.innerHTML = `<input id="historyDays" class="input is-small" type="number" min="0" placeholder="Last N days">`;
    controls.appendChild(timeCtrl);
    (qs('#historyDays') as HTMLInputElement | null)?.addEventListener('input', () => {
      page = 0;
      renderPage();
    });

    // Show backend mode (SQLite/JSON) as a subtle hint
    void electron
      .invoke('history:mode')
      .then((mode: string) => {
        const hint = document.createElement('span');
        hint.className = 'tag is-light is-rounded is-size-7';
        hint.textContent = mode === 'json' ? 'history: JSON' : 'history: SQLite';
        const wrap = document.createElement('div');
        wrap.className = 'control';
        wrap.appendChild(hint);
        controls!.appendChild(wrap);
      })
      .catch(() => {
        /* ignore */
      });
  }
}

function getFiltered(): any[] {
  const q = (qs('#historySearch') as HTMLInputElement | null)?.value?.toLowerCase() ?? '';
  if (!q) return allEntries;
  return allEntries.filter((e) =>
    String(e.domain || '')
      .toLowerCase()
      .includes(q)
  );
}

function renderPage(): void {
  let entries = getFiltered();
  const statusVal = (qs('#historyStatusFilter') as HTMLSelectElement | null)?.value ?? '';
  if (statusVal) {
    entries = entries.filter((e) => String(e.status || '') === statusVal);
  }
  const days = Number((qs('#historyDays') as HTMLInputElement | null)?.value || '');
  if (!Number.isNaN(days) && days > 0) {
    const cutoff = Date.now() - days * 86400000;
    entries = entries.filter((e) => Number(e.timestamp || 0) >= cutoff);
  }
  const tbody = qs('#historyTable tbody')!;
  tbody.innerHTML = '';
  if (!entries.length) {
    qs('#historyEmpty')!.classList.remove('is-hidden');
    (qs('#historyStatus') as HTMLElement | null)!.textContent = '';
    return;
  }
  qs('#historyEmpty')!.classList.add('is-hidden');
  const start = page * pageSize;
  const end = Math.min(start + pageSize, entries.length);
  for (let i = start; i < end; i++) {
    const e = entries[i];
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
  (qs('#historyStatus') as HTMLElement | null)!.textContent =
    `${start + 1}-${end} of ${entries.length}`;
}

function loadHistory(): void {
  ensureControls();
  electron.invoke('history:get').then((entries: any[]) => {
    allEntries = entries || [];
    page = 0;
    renderPage();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  void on('click', '#clearHistory', async () => {
    await electron.invoke('history:clear');
    loadHistory();
  });
  void on('click', '#monitorStart', async () => {
    await electron.invoke('monitor:start');
  });
  void on('click', '#monitorStop', async () => {
    await electron.invoke('monitor:stop');
  });
  electron.on('monitor:update', (domain: string, status: DomainStatus) => {
    debug(`Monitor update for ${domain}: ${status}`);
  });

  // Refresh history when bulk results/status update
  electron.on(IpcChannel.BulkwhoisResultReceive, () => loadHistory());
  electron.on(IpcChannel.BulkwhoisExportCancel, () => loadHistory());
  electron.on(IpcChannel.BulkwhoisStatusUpdate, () => loadHistory());

  // Refresh after single lookup completes (best effort)
  void on('click', '#singlewhoisButtonOk', () => setTimeout(loadHistory, 300));
  electron.on('history:updated', () => loadHistory());
});

export const _test = { loadHistory };

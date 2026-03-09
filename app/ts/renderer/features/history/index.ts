import { qs, on } from '../../../utils/dom.js';
import { historyGetFiltered, historyClear } from '../../../common/bridge/history.js';
import { monitorStart, monitorStop } from '../../../common/bridge/monitor.js';
import { listen } from '../../../common/bridge/core.js';
import type { HistoryPageResult } from '../../../common/bridge/types.js';
import { debugFactory } from '../../../common/logger.js';
import { IpcChannel } from '../../../common/ipcChannels.js';
import DomainStatus from '../../../common/status.js';

const debug = debugFactory('renderer.features.history');
debug('loaded');

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

let page = 0;
const pageSize = 50;
let lastResult: HistoryPageResult | null = null;

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
        void fetchAndRender();
      }
    });
    (qs('#historyNext') as HTMLButtonElement | null)?.addEventListener('click', () => {
      if (lastResult && (page + 1) * pageSize < lastResult.total) {
        page++;
        void fetchAndRender();
      }
    });
    (qs('#historySearch') as HTMLInputElement | null)?.addEventListener('input', () => {
      page = 0;
      void fetchAndRender();
    });

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
      void fetchAndRender();
    });

    const timeCtrl = document.createElement('div');
    timeCtrl.className = 'control';
    timeCtrl.innerHTML =
      '<input id="historyDays" class="input is-small" type="number" min="0" placeholder="Last N days">';
    controls.appendChild(timeCtrl);
    (qs('#historyDays') as HTMLInputElement | null)?.addEventListener('input', () => {
      page = 0;
      void fetchAndRender();
    });

    const hint = document.createElement('span');
    hint.className = 'tag is-light is-rounded is-size-7';
    hint.textContent = 'history: SQLite';
    const wrap = document.createElement('div');
    wrap.className = 'control';
    wrap.appendChild(hint);
    controls.appendChild(wrap);
  }
}

async function fetchAndRender(): Promise<void> {
  const query = (qs('#historySearch') as HTMLInputElement | null)?.value?.trim() || undefined;
  const statusVal = (qs('#historyStatusFilter') as HTMLSelectElement | null)?.value || undefined;
  const daysRaw = Number((qs('#historyDays') as HTMLInputElement | null)?.value || '');
  const days = !Number.isNaN(daysRaw) && daysRaw > 0 ? daysRaw : undefined;

  const result = await historyGetFiltered({
    query,
    status: statusVal,
    days,
    page,
    pageSize
  });
  lastResult = result;

  const tbody = qs('#historyTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!result.entries.length) {
    qs('#historyEmpty')?.classList.remove('is-hidden');
    const statusEl = qs('#historyStatus') as HTMLElement | null;
    if (statusEl) statusEl.textContent = '';
    return;
  }

  qs('#historyEmpty')?.classList.add('is-hidden');
  const start = result.page * result.pageSize;
  const end = start + result.entries.length;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  tbody.innerHTML = result.entries
    .map(
      (entry) =>
        `<tr><td>${esc(entry.domain)}</td><td>${esc(entry.status)}</td><td>${esc(formatDate(
          entry.timestamp
        ))}</td></tr>`
    )
    .join('');

  const statusEl = qs('#historyStatus') as HTMLElement | null;
  if (statusEl) statusEl.textContent = `${start + 1}-${end} of ${result.total}`;
}

function loadHistory(): void {
  ensureControls();
  page = 0;
  void fetchAndRender();
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  void on('click', '#clearHistory', async () => {
    await historyClear();
    loadHistory();
  });
  void on('click', '#monitorStart', async () => {
    await monitorStart();
  });
  void on('click', '#monitorStop', async () => {
    await monitorStop();
  });
  void listen<{ domain: string; status: DomainStatus }>('monitor:update', ({ domain, status }) => {
    debug(`Monitor update for ${domain}: ${status}`);
  });
  void listen('bulk:result', () => loadHistory());
  void listen(IpcChannel.BulkwhoisExportCancel, () => loadHistory());
  void listen('bulk:status', () => loadHistory());
  void on('click', '#singlewhoisButtonOk', () => setTimeout(loadHistory, 300));
  void listen('history:updated', () => loadHistory());
});

export const _test = { loadHistory };

import { qs, qsa, on } from '../../utils/dom.js';
import { debugFactory } from '../../common/logger.js';
import { settings, saveSettings } from '../settings-renderer.js';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';
import type DomainStatus from '../../common/status.js';

const electron = (window as any).electron as RendererElectronAPI;
const debug = debugFactory('renderer.bwa.monitor');
debug('loaded');

function setTab(active: 'table' | 'monitor') {
  const tableLi = qs('#bwaTabTable')!;
  const monLi = qs('#bwaTabMonitor')!;
  tableLi.classList.toggle('is-active', active === 'table');
  monLi.classList.toggle('is-active', active === 'monitor');
  qs('#bwaAnalyserTabTable')!.classList.toggle('is-hidden', active !== 'table');
  qs('#bwaAnalyserTabMonitor')!.classList.toggle('is-hidden', active !== 'monitor');
}

void on('click', '#bwaTabTable', () => setTab('table'));
void on('click', '#bwaTabMonitor', () => setTab('monitor'));

function renderMonitorList(): void {
  const tb = qs('#monTable tbody')! as HTMLElement;
  tb.innerHTML = '';
  for (const d of settings.monitor?.list ?? []) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d}</td><td data-domain="${d}">-</td>`;
    tb.appendChild(tr);
  }
}

void on('click', '#monAdd', async () => {
  const input = qs<HTMLInputElement>('#monDomain');
  const v = (input?.value || '').trim();
  if (!v) return;
  settings.monitor = settings.monitor || { list: [], interval: 60000 };
  if (!settings.monitor.list.includes(v)) settings.monitor.list.push(v);
  await saveSettings(settings);
  renderMonitorList();
  input!.value = '';
});

void on('click', '#monStart', async () => {
  const val = Number(qs<HTMLInputElement>('#monInterval')?.value || 0);
  if (val && val > 0) {
    settings.monitor = settings.monitor || { list: [], interval: 60000 };
    settings.monitor.interval = val;
    await saveSettings(settings);
  }
  await electron.invoke('monitor:start');
});

void on('click', '#monStop', async () => {
  await electron.invoke('monitor:stop');
});

electron.on('monitor:update', (domain: string, status: DomainStatus) => {
  const cell = document.querySelector(`#monTable td[data-domain="${domain}"]`);
  if (cell) cell.textContent = String(status);
});

// Initial render when analyser view shows
document.addEventListener('DOMContentLoaded', renderMonitorList);

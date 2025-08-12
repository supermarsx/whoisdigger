import { qs, qsa, on } from '../utils/dom.js';
import { debugFactory } from '../common/logger.js';
import { IpcChannel } from '../common/ipcChannels.js';
import type * as fs from 'fs';
import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI & {
  getBaseDir: () => Promise<string>;
  readFile: (p: string, opts?: BufferEncoding | fs.ReadFileOptions) => Promise<any>;
  stat: (p: string) => Promise<any>;
  readdir: (p: string, opts?: fs.ReaddirOptions) => Promise<any>;
  unlink: (p: string) => Promise<any>;
  access: (p: string, mode?: number) => Promise<any>;
  exists: (p: string) => Promise<any>;
  watch: (
    p: string,
    opts: fs.WatchOptions,
    cb: (evt: { event: string; filename: string | null }) => void
  ) => Promise<{ close: () => void }>;
  path: { join: (...args: string[]) => Promise<string>; basename: (p: string) => Promise<string> };
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  off: (channel: string, listener: (...args: any[]) => void) => void;
  openDataDir: () => Promise<any>;
};

const debug = debugFactory('renderer.options');
debug('loaded');
import {
  settings,
  saveSettings,
  validateSettings,
  loadSettings,
  customSettingsLoaded,
  getUserDataPath
} from './settings-renderer.js';
import { byteToHumanFileSize } from '../common/conversions.js';
import appDefaults, { appSettingsDescriptions } from '../appsettings.js';

function getValue(path: string): any {
  return path.split('.').reduce((obj: any, key: string) => (obj ? obj[key] : undefined), settings);
}

function setValue(path: string, value: any): void {
  const keys = path.split('.');
  let obj: any = settings;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in obj)) obj[k] = {};
    obj = obj[k];
  }
  obj[keys[keys.length - 1]] = value;
}

function parseValue(val: string): any {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  return val;
}

function getDefault(path: string): any {
  return path
    .split('.')
    .reduce((obj: any, key: string) => (obj ? obj[key] : undefined), appDefaults.settings);
}

let statsWatcherId: number | null = null;
let statsConfigPath = '';
let statsDataDir = '';
let statsHandler: ((data: any) => void) | null = null;

async function startStatsWorker(): Promise<void> {
  if (statsWatcherId !== null) {
    if (statsHandler) {
      electron.off('stats:update', statsHandler);
    }
    void electron.invoke('stats:stop', statsWatcherId);
    statsWatcherId = null;
    statsHandler = null;
  }
  statsConfigPath = await electron.path.join(
    getUserDataPath(),
    settings.customConfiguration.filepath
  );
  statsDataDir = getUserDataPath();
  statsWatcherId = await electron.invoke('stats:start', statsConfigPath, statsDataDir);
  statsHandler = (data: any) => updateStats(data);
  electron.on('stats:update', statsHandler);
}

function refreshStats(): void {
  if (statsWatcherId !== null) {
    void electron.invoke('stats:refresh', statsWatcherId);
  }
}

function updateStats(data: {
  mtime: number | null;
  loaded: boolean;
  size: number;
  configPath: string;
  configSize: number;
  readWrite: boolean;
  dataPath: string;
}): void {
  qs('#stat-config-path')!.textContent = data.configPath;
  qs('#stat-config-size')!.textContent = byteToHumanFileSize(
    data.configSize,
    settings.lookupMisc.useStandardSize
  );
  qs('#stat-config-loaded')!.textContent = data.loaded ? 'Loaded' : 'Not loaded';
  qs('#stat-config-mtime')!.textContent = data.mtime ? new Date(data.mtime).toUTCString() : 'N/A';
  qs('#stat-config-perms')!.textContent = data.readWrite ? 'Read/Write' : 'Read only';
  qs('#stat-data-path')!.textContent = data.dataPath;
  qs('#stat-data-size')!.textContent = byteToHumanFileSize(
    data.size,
    settings.lookupMisc.useStandardSize
  );
}

const enumOptions: Record<string, string[]> = {
  'lookupGeneral.type': ['dns', 'whois', 'rdap'],
  'lookupProxy.mode': ['single', 'multi'],
  'lookupProxy.multimode': ['sequential', 'random', 'ascending', 'descending'],
  'lookupProxy.checktype': ['ping', 'request', 'ping+request'],
  'lookupConversion.algorithm': ['uts46', 'uts46-transitional', 'punycode', 'ascii'],
  'ui.language': ['en', 'es']
};

function buildEntries(obj: any, prefix: string, table: HTMLElement): void {
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      table.insertAdjacentHTML(
        'beforeend',
        `<tr class="group-row"><th colspan="2"><h4 class="title is-5">${key}</h4></th></tr>`
      );
      buildEntries(value, prefix ? `${prefix}.${key}` : key, table);
    } else {
      const path = prefix ? `${prefix}.${key}` : key;
      const id = `appSettings.${path}`;
      let inputHtml = '';
      const enumVals = enumOptions[path];
      if (enumVals) {
        const opts = enumVals.map((v) => `<option value="${v}">${v}</option>`).join('');
        inputHtml = `<div class="select is-small"><select id="${id}">${opts}</select></div>`;
      } else if (typeof value === 'boolean') {
        inputHtml = `<div class="select is-small"><select id="${id}"><option value="true">true</option><option value="false">false</option></select></div>`;
      } else {
        inputHtml = `<input id="${id}" class="input is-small" type="text">`;
      }
      const desc = appSettingsDescriptions[path];
      const descHtml = desc ? `<p class="help is-size-7">${desc}</p>` : '';
      const thHtml = `${key}${descHtml}`;
      const rowHtml = `<tr><th>${thHtml}</th><td class="is-expanded"><div class="field has-addons"><div class="control is-expanded">${inputHtml}</div><div class="control"><button class="button is-small reset-btn" data-path="${path}"><span class="icon is-small"><i class="fas fa-undo"></i></span></button></div><div class="control"><span class="icon result-icon"></span></div></div></td></tr>`;
      table.insertAdjacentHTML('beforeend', rowHtml);
    }
  });
}

export function populateInputs(): void {
  qsa('#opTable input[id], #opTable select[id]').forEach((el) => {
    const id = el.id;
    if (!id) return;
    const path = id.replace(/^appSettings\./, '');
    const allowed = enumOptions[path];
    let val = getValue(path);
    if (allowed && (val === undefined || !allowed.includes(String(val)))) {
      val = getDefault(path);
      setValue(path, val);
      void saveSettings(settings);
    }
    if (val !== undefined) {
      (el as HTMLInputElement | HTMLSelectElement).value = String(val);
    }
  });
}

function saveEntry(path: string, input: HTMLElement, val: any): void {
  setValue(path, val);
  void saveSettings(settings).then((result) => {
    const icon = input.closest('.field')?.querySelector('.result-icon');
    if (!icon) return;
    if (result === 'SAVED' || result === undefined) {
      icon.innerHTML = '<i class="fas fa-check has-text-success"></i>';
    } else {
      icon.innerHTML = '<i class="fas fa-times has-text-danger"></i>';
    }
    setTimeout(() => (icon.innerHTML = ''), 1500);
  });
}

function showToast(message: string, success: boolean): void {
  const toast = document.createElement('div');
  toast.className = `toast ${success ? 'is-success' : 'is-danger'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function filterOptions(term: string): void {
  const needle = term.trim().toLowerCase();
  const rows = qsa('#opTable tr');
  if (!needle) {
    rows.forEach((r) => ((r as HTMLElement).style.display = ''));
    qs('#opSearchNoResults')!.classList.add('is-hidden');
    return;
  }

  rows.forEach((row) => {
    const el = row as HTMLElement;
    if (el.classList.contains('group-row')) {
      el.style.display = '';
      return;
    }
    const visible = el.textContent?.toLowerCase().includes(needle) ?? false;
    el.style.display = visible ? '' : 'none';
  });

  qsa('#opTable .group-row').forEach((group) => {
    let sibling = group.nextElementSibling;
    let visible = false;
    while (sibling && !sibling.classList.contains('group-row')) {
      if ((sibling as HTMLElement).style.display !== 'none') {
        visible = true;
        break;
      }
      sibling = sibling.nextElementSibling;
    }
    (group as HTMLElement).style.display = visible ? '' : 'none';
  });

  const anyVisible = rows.some(
    (r) => !r.classList.contains('group-row') && (r as HTMLElement).style.display !== 'none'
  );
  qs('#opSearchNoResults')!.classList.toggle('is-hidden', anyVisible);
}

document.addEventListener('DOMContentLoaded', () => {
  const container = qs('#settingsEntry')!;
  const table = qs('#opTable')!;
  buildEntries(appDefaults.settings, '', table);
  filterOptions('');
  const opSearch = qs<HTMLInputElement>('#opSearch');
  opSearch?.addEventListener('input', () => {
    filterOptions(opSearch.value);
  });
  // Wait for the final settings to load before populating fields

  void startStatsWorker();

  if (sessionStorage.getItem('settingsLoaded') !== 'true') {
    qs('#settings-not-loaded')!.classList.remove('is-hidden');
  }

  window.addEventListener('settings-loaded', () => {
    qs('#settings-not-loaded')!.classList.add('is-hidden');
    populateInputs();
    void startStatsWorker();
  });

  window.addEventListener('settings-reloaded', () => {
    populateInputs();
    void startStatsWorker();
  });

  on('change', '#settingsEntry input[id], #settingsEntry select[id]', (ev) => {
    const el = (ev.target as Element).closest('input[id],select[id]') as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    if (!el) return;
    const id = el.id;
    if (!id) return;
    const path = id.replace(/^appSettings\./, '');
    const val = parseValue((el as HTMLInputElement | HTMLSelectElement).value);
    saveEntry(path, el, val);
  });

  on('click', '#settingsEntry .reset-btn', (ev) => {
    const btn = (ev.target as Element).closest('.reset-btn') as HTMLElement | null;
    if (!btn) return;
    const path = btn.getAttribute('data-path') as string;
    const def = getDefault(path);
    const input = qs<HTMLInputElement | HTMLSelectElement>(`[id="appSettings.${path}"]`);
    if (input) {
      input.value = String(def);
      saveEntry(path, input, def);
    }
  });

  on('click', '#restoreDefaults', () => {
    qs('#restoreDefaultsModal')!.classList.add('is-active');
  });

  on('click', '#restoreDefaultsYes', () => {
    const defaults = validateSettings({});
    Object.assign(settings, defaults);
    populateInputs();
    void saveSettings(settings).then((r) => {
      showToast(
        r === 'SAVED' || r === undefined ? 'Defaults restored' : 'Failed to restore defaults',
        r === 'SAVED' || r === undefined
      );
    });
    qs('#restoreDefaultsModal')!.classList.remove('is-active');
  });

  on('click', '#restoreDefaultsNo, #restoreDefaultsModal .delete', () => {
    qs('#restoreDefaultsModal')!.classList.remove('is-active');
  });

  on('click', '#reloadSettings', async () => {
    await loadSettings();
    sessionStorage.setItem('customSettingsLoaded', customSettingsLoaded ? 'true' : 'false');
    populateInputs();
    const filePath = await electron.path.join(
      getUserDataPath(),
      settings.customConfiguration.filepath
    );
    const exists = await electron.exists(filePath);
    const success = customSettingsLoaded || !exists;
    showToast(success ? 'Configuration reloaded' : 'Failed to reload configuration', success);
    refreshStats();
  });

  on('click', '#saveConfig', async () => {
    const res = await saveSettings(settings);
    showToast(
      res === 'SAVED' || res === undefined ? 'Configuration saved' : 'Failed to save configuration',
      res === 'SAVED' || res === undefined
    );
    refreshStats();
  });

  on('click', '#openDataFolder', async () => {
    const result = await electron.openDataDir();
    if (result) {
      showToast('Failed to open data directory', false);
    }
  });

  on('click', '#downloadModel', async () => {
    if (!settings.ai.modelURL) {
      showToast('Model URL not configured', false);
      return;
    }
    try {
      await electron.invoke('ai:download-model');
      showToast('Model download started', true);
    } catch {
      showToast('Model download failed', false);
    }
  });

  on('click', '#reloadApp', async () => {
    try {
      await electron.invoke('app:reload');
    } catch {
      showToast('Failed to reload application', false);
    }
  });

  on('click', '#deleteConfig', () => {
    qs('#deleteConfigModal')!.classList.add('is-active');
  });

  on('click', '#deleteConfigYes', async () => {
    const filePath = await electron.path.join(
      getUserDataPath(),
      settings.customConfiguration.filepath
    );
    try {
      await electron.invoke('config:delete', filePath);
      showToast('Configuration deleted', true);
    } catch (err) {
      if ((err as any).code !== 'ENOENT') {
        showToast('Failed to delete configuration', false);
      } else {
        showToast('Configuration deleted', true);
      }
    }
    refreshStats();
    qs('#deleteConfigModal')!.classList.remove('is-active');
  });

  on('click', '#deleteConfigNo, #deleteConfigModal .delete', () => {
    qs('#deleteConfigModal')!.classList.remove('is-active');
  });

  const backToTop = qs('#settingsBackToTop')!;
  const goToBottom = qs('#settingsGoToBottom')!;
  const containerEl = qs('#contents-container') as HTMLElement;
  containerEl.addEventListener('scroll', () => {
    if (qs('#settingsMainContainer')!.classList.contains('current')) {
      const top = containerEl.scrollTop;
      const bottom = containerEl.scrollHeight - containerEl.clientHeight - top;
      backToTop.classList.toggle('is-visible', top > 200);
      goToBottom.classList.toggle('is-visible', bottom > 200);
    } else {
      backToTop.classList.remove('is-visible');
      goToBottom.classList.remove('is-visible');
    }
  });
  backToTop.addEventListener('click', () => {
    containerEl.scrollTo({ top: 0, behavior: 'smooth' });
  });
  goToBottom.addEventListener('click', () => {
    containerEl.scrollTo({ top: containerEl.scrollHeight, behavior: 'smooth' });
  });
});

export const _test = {
  getValue,
  setValue,
  parseValue,
  getDefault
};

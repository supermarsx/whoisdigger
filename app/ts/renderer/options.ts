import $ from 'jquery';
import fs from 'fs';
import path from 'path';
import { shell, ipcRenderer } from 'electron';
import { Worker } from 'worker_threads';
import chokidar from 'chokidar';
import {
  settings,
  saveSettings,
  validateSettings,
  loadSettings,
  customSettingsLoaded,
  getUserDataPath
} from '../common/settings';
import { byteToHumanFileSize } from '../common/conversions';
import appDefaults, { appSettingsDescriptions } from '../appsettings';

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

let statsWorker: Worker | null = null;
let statsWatcher: chokidar.FSWatcher | null = null;
let statsConfigPath = '';
let statsDataDir = '';

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await dirSize(full);
      } else {
        total += (await fs.promises.stat(full)).size;
      }
    } catch {
      // ignore errors from deleted files
    }
  }
  return total;
}

async function sendStats(): Promise<void> {
  let mtime: number | null = null;
  let loaded = false;
  let cfgSize = 0;
  let readWrite = false;
  try {
    const st = await fs.promises.stat(statsConfigPath);
    mtime = st.mtimeMs;
    cfgSize = st.size;
    loaded = true;
    try {
      await fs.promises.access(statsConfigPath, fs.constants.R_OK | fs.constants.W_OK);
      readWrite = true;
    } catch {
      readWrite = false;
    }
  } catch {
    loaded = false;
    cfgSize = 0;
  }
  let size = 0;
  try {
    size = await dirSize(statsDataDir);
  } catch {
    size = 0;
  }
  updateStats({
    mtime,
    loaded,
    size,
    configPath: statsConfigPath,
    configSize: cfgSize,
    readWrite,
    dataPath: statsDataDir
  });
}

function startStatsWorker(): void {
  if (statsWorker) {
    statsWorker.terminate();
    statsWorker = null;
  }
  if (statsWatcher) {
    statsWatcher.close();
    statsWatcher = null;
  }
  statsConfigPath = path.join(getUserDataPath(), settings.customConfiguration.filepath);
  statsDataDir = getUserDataPath();
  try {
    const workerPath = path.join(__dirname, 'renderer', 'workers', 'statsWorker.js');
    statsWorker = new Worker(workerPath, {
      workerData: {
        configPath: statsConfigPath,
        dataDir: statsDataDir
      }
    });
    statsWorker.on('message', updateStats);
  } catch (err) {
    console.error('Failed to start worker, falling back to main thread:', err);
    statsWatcher = chokidar.watch([statsConfigPath, statsDataDir], { ignoreInitial: true });
    statsWatcher.on('all', () => {
      void sendStats();
    });
    void sendStats();
  }
}

function refreshStats(): void {
  if (statsWorker) {
    statsWorker.postMessage('refresh');
  } else {
    void sendStats();
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
  $('#stat-config-path').text(data.configPath);
  $('#stat-config-size').text(
    byteToHumanFileSize(data.configSize, settings.lookupMisc.useStandardSize)
  );
  $('#stat-config-loaded').text(data.loaded ? 'Loaded' : 'Not loaded');
  $('#stat-config-mtime').text(data.mtime ? new Date(data.mtime).toUTCString() : 'N/A');
  $('#stat-config-perms').text(data.readWrite ? 'Read/Write' : 'Read only');
  $('#stat-data-path').text(data.dataPath);
  $('#stat-data-size').text(byteToHumanFileSize(data.size, settings.lookupMisc.useStandardSize));
}

const enumOptions: Record<string, string[]> = {
  'lookupGeneral.type': ['dns', 'whois'],
  'lookupProxy.mode': ['single', 'multi'],
  'lookupProxy.multimode': ['sequential', 'random', 'ascending', 'descending'],
  'lookupProxy.checktype': ['ping', 'request', 'ping+request'],
  'lookupConversion.algorithm': ['uts46', 'uts46-transitional', 'punycode', 'ascii']
};

function buildEntries(obj: any, prefix: string, table: JQuery<HTMLElement>): void {
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      table.append(
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
      const row = $(
        `<tr><th>${thHtml}</th><td class="is-expanded"><div class="field has-addons"><div class="control is-expanded">${inputHtml}</div><div class="control"><button class="button is-small reset-btn" data-path="${path}"><span class="icon is-small"><i class="fas fa-undo"></i></span></button></div><div class="control"><span class="icon result-icon"></span></div></div></td></tr>`
      );
      table.append(row);
    }
  });
}

export function populateInputs(): void {
  $('#opTable')
    .find('input[id], select[id]')
    .each((_, el) => {
      const $el = $(el);
      const id = $el.attr('id');
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
        if ($el.is('select')) {
          $el.val(String(val));
        } else {
          $el.val(String(val));
        }
      }
    });
}

function saveEntry(path: string, $input: JQuery<HTMLElement>, val: any): void {
  setValue(path, val);
  void saveSettings(settings).then((result) => {
    const icon = $input.closest('.field').find('.result-icon');
    if (result === 'SAVED' || result === undefined) {
      icon.html('<i class="fas fa-check has-text-success"></i>');
    } else {
      icon.html('<i class="fas fa-times has-text-danger"></i>');
    }
    setTimeout(() => icon.empty(), 1500);
  });
}

function showToast(message: string, success: boolean): void {
  const toast = $(`<div class="toast ${success ? 'is-success' : 'is-danger'}">${message}</div>`);
  $('body').append(toast);
  setTimeout(() => {
    toast.fadeOut(400, () => toast.remove());
  }, 3000);
}

function filterOptions(term: string): void {
  const needle = term.trim().toLowerCase();
  const rows = $('#opTable tr');
  if (!needle) {
    rows.show();
    $('#opSearchNoResults').addClass('is-hidden');
    return;
  }

  rows.each(function () {
    const $row = $(this);
    if ($row.hasClass('group-row')) {
      $row.show();
      return;
    }
    $row.toggle($row.text().toLowerCase().includes(needle));
  });

  $('#opTable .group-row').each(function () {
    const $group = $(this);
    const visible = $group.nextUntil('.group-row').filter(':visible').length > 0;
    $group.toggle(visible);
  });

  const anyVisible = rows.not('.group-row').filter(':visible').length > 0;
  $('#opSearchNoResults').toggleClass('is-hidden', anyVisible);
}

$(document).ready(() => {
  const container = $('#opEntry');
  const table = $('#opTable');
  buildEntries(appDefaults.settings, '', table);
  filterOptions('');
  $('#opSearch').on('input', function () {
    filterOptions($(this).val() as string);
  });
  // Wait for the final settings to load before populating fields

  startStatsWorker();

  if (sessionStorage.getItem('settingsLoaded') !== 'true') {
    $('#settings-not-loaded').removeClass('is-hidden');
  }

  window.addEventListener('settings-loaded', () => {
    $('#settings-not-loaded').addClass('is-hidden');
    populateInputs();
    startStatsWorker();
  });

  window.addEventListener('settings-reloaded', () => {
    populateInputs();
    startStatsWorker();
  });

  container.on('change', 'input[id], select[id]', function () {
    const $el = $(this);
    const id = $el.attr('id');
    if (!id) return;
    const path = id.replace(/^appSettings\./, '');
    const raw = $el.is('select') ? $el.val() : $el.val();
    const val = typeof raw === 'string' ? parseValue(raw) : raw;
    saveEntry(path, $el, val);
  });

  container.on('click', '.reset-btn', function () {
    const path = $(this).data('path') as string;
    const def = getDefault(path);
    const id = `appSettings.${path}`.replace(/\./g, '\\.');
    const $input = $('#' + id);
    if ($input.is('select')) {
      $input.val(String(def));
    } else {
      $input.val(String(def));
    }
    saveEntry(path, $input, def);
  });

  $('#restoreDefaults').on('click', () => {
    $('#restoreDefaultsModal').addClass('is-active');
  });

  $('#restoreDefaultsYes').on('click', () => {
    const defaults = validateSettings({});
    Object.assign(settings, defaults);
    populateInputs();
    void saveSettings(settings).then((r) => {
      showToast(
        r === 'SAVED' || r === undefined ? 'Defaults restored' : 'Failed to restore defaults',
        r === 'SAVED' || r === undefined
      );
    });
    $('#restoreDefaultsModal').removeClass('is-active');
  });

  $('#restoreDefaultsNo, #restoreDefaultsModal .delete').on('click', () => {
    $('#restoreDefaultsModal').removeClass('is-active');
  });

  $('#reloadSettings').on('click', async () => {
    await loadSettings();
    sessionStorage.setItem('customSettingsLoaded', customSettingsLoaded ? 'true' : 'false');
    populateInputs();
    const filePath = path.join(getUserDataPath(), settings.customConfiguration.filepath);
    const exists = fs.existsSync(filePath);
    const success = customSettingsLoaded || !exists;
    showToast(success ? 'Configuration reloaded' : 'Failed to reload configuration', success);
    refreshStats();
  });

  $('#saveConfig').on('click', async () => {
    const res = await saveSettings(settings);
    showToast(
      res === 'SAVED' || res === undefined ? 'Configuration saved' : 'Failed to save configuration',
      res === 'SAVED' || res === undefined
    );
    refreshStats();
  });

  $('#openDataFolder').on('click', async () => {
    const dataDir = getUserDataPath();
    const result = await shell.openPath(dataDir);
    if (result) {
      showToast('Failed to open data directory', false);
    }
  });

  $('#reloadApp').on('click', async () => {
    try {
      await ipcRenderer.invoke('app:reload');
    } catch {
      showToast('Failed to reload application', false);
    }
  });

  $('#deleteConfig').on('click', () => {
    $('#deleteConfigModal').addClass('is-active');
  });

  $('#deleteConfigYes').on('click', () => {
    const filePath = path.join(getUserDataPath(), settings.customConfiguration.filepath);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        showToast('Failed to delete configuration', false);
      } else {
        showToast('Configuration deleted', true);
      }
    });
    refreshStats();
    $('#deleteConfigModal').removeClass('is-active');
  });

  $('#deleteConfigNo, #deleteConfigModal .delete').on('click', () => {
    $('#deleteConfigModal').removeClass('is-active');
  });

  const backToTop = $('#opBackToTop');
  const containerEl = $('#contents-container');
  containerEl.on('scroll', () => {
    if ($('#opMainContainer').hasClass('current')) {
      const top = containerEl.scrollTop() ?? 0;
      backToTop.toggleClass('is-visible', top > 200);
    } else {
      backToTop.removeClass('is-visible');
    }
  });
  backToTop.on('click', () => {
    containerEl.animate({ scrollTop: 0 }, 300);
  });
});

export const _test = {
  getValue,
  setValue,
  parseValue,
  getDefault
};

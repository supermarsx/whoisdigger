import $ from 'jquery';
import fs from 'fs';
import path from 'path';
import {
  settings,
  saveSettings,
  validateSettings,
  loadSettings,
  getUserDataPath
} from '../common/settings';
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

const enumOptions: Record<string, string[]> = {
  'app.lookupGeneral.type': ['dns', 'whois'],
  'app.lookupProxy.mode': ['single', 'multi'],
  'app.lookupProxy.multimode': ['sequential', 'random', 'ascending', 'descending'],
  'app.lookupProxy.checktype': ['ping', 'request', 'ping+request'],
  'app.lookupConversion.algorithm': [
    'uts46',
    'uts46-transitional',
    'punycode',
    'ascii'
  ]
};

function buildEntries(obj: any, prefix: string, table: JQuery<HTMLElement>): void {
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      table.append(`<tr><th colspan="2"><h4 class="title is-5">${key}</h4></th></tr>`);
      buildEntries(value, prefix ? `${prefix}.${key}` : key, table);
    } else {
      const path = prefix ? `${prefix}.${key}` : key;
      const id = `appSettings.${path}`;
      let inputHtml = '';
      const enumVals = enumOptions[`app.${path}`];
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

function populateInputs(): void {
  $('#opTable')
    .find('input[id], select[id]')
    .each((_, el) => {
      const $el = $(el);
      const id = $el.attr('id');
      if (!id) return;
      const path = id.replace(/^appSettings\./, 'app.');
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
  const toast = $(
    `<div class="toast ${success ? 'is-success' : 'is-danger'}">${message}</div>`
  );
  $('body').append(toast);
  setTimeout(() => {
    toast.fadeOut(400, () => toast.remove());
  }, 3000);
}

$(document).ready(() => {
  const container = $('#opEntry');
  const table = $('#opTable');
  buildEntries(appDefaults.settings, '', table);
  // Wait for the final settings to load before populating fields

  const status = $('#custom-settings-status');
  const customLoaded = sessionStorage.getItem('customSettingsLoaded') === 'true';
  status.text(customLoaded ? 'Custom settings loaded.' : 'Custom settings not loaded.');

  if (sessionStorage.getItem('settingsLoaded') !== 'true') {
    $('#settings-not-loaded').removeClass('is-hidden');
  }

  window.addEventListener('settings-loaded', () => {
    $('#settings-not-loaded').addClass('is-hidden');
    const loaded = sessionStorage.getItem('customSettingsLoaded') === 'true';
    status.text(loaded ? 'Custom settings loaded.' : 'Custom settings not loaded.');
    populateInputs();
  });

  container.on('change', 'input[id], select[id]', function () {
    const $el = $(this);
    const id = $el.attr('id');
    if (!id) return;
    const path = id.replace(/^appSettings\./, 'app.');
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
        r === 'SAVED' || r === undefined
          ? 'Defaults restored'
          : 'Failed to restore defaults',
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
    populateInputs();
  });

  $('#saveConfig').on('click', async () => {
    const res = await saveSettings(settings);
    showToast(
      res === 'SAVED' || res === undefined
        ? 'Configuration saved'
        : 'Failed to save configuration',
      res === 'SAVED' || res === undefined
    );
  });

  $('#deleteConfig').on('click', () => {
    $('#deleteConfigModal').addClass('is-active');
  });

  $('#deleteConfigYes').on('click', () => {
    const filePath = path.join(getUserDataPath(), settings.customConfiguration.filepath);
    fs.unlink(filePath, (err) => {
      if (err) {
        showToast('Failed to delete configuration', false);
      } else {
        showToast('Configuration deleted', true);
      }
    });
    $('#deleteConfigModal').removeClass('is-active');
  });

  $('#deleteConfigNo, #deleteConfigModal .delete').on('click', () => {
    $('#deleteConfigModal').removeClass('is-active');
  });
});
